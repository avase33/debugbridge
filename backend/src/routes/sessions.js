import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Session } from '../models/Session.js';
import { Snapshot } from '../models/Snapshot.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { diffSnapshots } from '../services/diffService.js';
import { generateBridge } from '../services/bridgeGenerator.js';

const router = Router();

function ok(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Validation failed', errors: errors.array() }); return false; }
  return true;
}

// GET /sessions/public
router.get('/public', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const sessions = await Session.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-comments -collaborators')
      .populate('owner', 'username avatarUrl')
      .populate('reporterSnapshot', 'label system runtimes');
    const total = await Session.countDocuments({ isPublic: true });
    res.json({ sessions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// GET /sessions
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const filter = {
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
    };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };

    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('owner', 'username avatarUrl')
        .populate('reporterSnapshot', 'label system runtimes'),
      Session.countDocuments(filter),
    ]);
    res.json({ sessions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// POST /sessions — create a debug session
router.post('/',
  authenticate,
  [
    body('title').notEmpty().isLength({ max: 200 }),
    body('description').optional().isLength({ max: 2000 }),
    body('errorMessage').optional().isLength({ max: 1000 }),
    body('isPublic').optional().isBoolean(),
    body('tags').optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      if (!ok(req, res)) return;
      const { title, description, errorMessage, errorStack, reproSteps, isPublic = false, tags = [] } = req.body;
      const session = new Session({
        owner: req.user._id,
        title,
        description,
        errorMessage,
        errorStack,
        reproSteps,
        isPublic,
        tags,
      });
      await session.save();
      req.user.sessionsCreated = (req.user.sessionsCreated || 0) + 1;
      await req.user.save();
      res.status(201).json({ session });
    } catch (err) { next(err); }
  }
);

// GET /sessions/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }, { isPublic: true }],
    })
      .populate('owner', 'username avatarUrl')
      .populate('reporterSnapshot')
      .populate('compareSnapshots')
      .populate('comments.author', 'username avatarUrl');

    if (!session) return res.status(404).json({ error: 'Session not found' });
    session.views = (session.views || 0) + 1;
    await session.save();
    res.json({ session });
  } catch (err) { next(err); }
});

// PATCH /sessions/:id — update metadata / status
router.patch('/:id',
  authenticate,
  [
    body('title').optional().isLength({ max: 200 }),
    body('status').optional().isIn(['open', 'resolved', 'archived']),
    body('isPublic').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      if (!ok(req, res)) return;
      const session = await Session.findOne({ _id: req.params.id, owner: req.user._id });
      if (!session) return res.status(404).json({ error: 'Session not found' });
      const fields = ['title', 'description', 'errorMessage', 'errorStack', 'reproSteps', 'status', 'isPublic', 'tags'];
      for (const f of fields) { if (req.body[f] !== undefined) session[f] = req.body[f]; }
      await session.save();
      res.json({ session });
    } catch (err) { next(err); }
  }
);

// DELETE /sessions/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const session = await Session.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (err) { next(err); }
});

// POST /sessions/:id/snapshots — attach a snapshot to a session
router.post('/:id/snapshots',
  authenticate,
  [body('snapshotId').notEmpty(), body('role').optional().isIn(['reporter', 'compare'])],
  async (req, res, next) => {
    try {
      if (!ok(req, res)) return;
      const session = await Session.findOne({ _id: req.params.id, owner: req.user._id });
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const snapshot = await Snapshot.findOne({ _id: req.body.snapshotId, owner: req.user._id });
      if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

      const role = req.body.role || 'compare';
      if (role === 'reporter') {
        session.reporterSnapshot = snapshot._id;
      } else {
        if (!session.compareSnapshots.includes(snapshot._id)) {
          session.compareSnapshots.push(snapshot._id);
        }
      }
      await session.save();
      res.json({ session });
    } catch (err) { next(err); }
  }
);

// GET /sessions/:id/diff — diff reporter vs compare snapshots, auto-generate resolved bridge
router.get('/:id/diff', authenticate, async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
    }).populate('reporterSnapshot').populate('compareSnapshots');

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.reporterSnapshot) return res.status(400).json({ error: 'No reporter snapshot attached' });
    if (!session.compareSnapshots.length) return res.status(400).json({ error: 'No compare snapshots attached' });

    const diffs = session.compareSnapshots.map((comp) => ({
      snapshotId: comp._id,
      label: comp.label,
      diff: diffSnapshots(session.reporterSnapshot, comp),
    }));

    // If no resolved bridge yet, generate one from the highest-risk compare snapshot
    if (!session.resolvedBridge) {
      const highestRisk = diffs.reduce((prev, curr) => {
        const riskOrder = { high: 3, medium: 2, low: 1, none: 0 };
        return riskOrder[curr.diff.riskLevel] > riskOrder[prev.diff.riskLevel] ? curr : prev;
      }, diffs[0]);
      const targetSnap = session.compareSnapshots.find((s) => s._id.toString() === highestRisk.snapshotId.toString());
      if (targetSnap) {
        session.resolvedBridge = { ...generateBridge(targetSnap), notes: 'Auto-generated from highest-risk environment' };
        await session.save();
      }
    }

    res.json({ diffs, reporterSnapshot: { _id: session.reporterSnapshot._id, label: session.reporterSnapshot.label }, resolvedBridge: session.resolvedBridge });
  } catch (err) { next(err); }
});

// POST /sessions/:id/comments
router.post('/:id/comments',
  authenticate,
  [body('text').notEmpty().isLength({ max: 2000 })],
  async (req, res, next) => {
    try {
      if (!ok(req, res)) return;
      const session = await Session.findOne({
        _id: req.params.id,
        $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
      });
      if (!session) return res.status(404).json({ error: 'Session not found' });
      session.comments.push({ author: req.user._id, text: req.body.text });
      await session.save();
      await session.populate('comments.author', 'username avatarUrl');
      res.status(201).json({ comment: session.comments[session.comments.length - 1] });
    } catch (err) { next(err); }
  }
);

export default router;
