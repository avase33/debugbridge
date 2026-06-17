import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Snapshot } from '../models/Snapshot.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { parseSnapshot } from '../services/snapshotParser.js';
import { generateBridge } from '../services/bridgeGenerator.js';
import { diffSnapshots } from '../services/diffService.js';
import config from '../config/index.js';

const router = Router();

function ok(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Validation failed', errors: errors.array() }); return false; }
  return true;
}

// POST /snapshots — upload and parse a new snapshot
router.post('/',
  authenticate,
  [body('label').optional().isLength({ max: 120 }), body('isPublic').optional().isBoolean()],
  async (req, res, next) => {
    try {
      if (!ok(req, res)) return;
      const { label, isPublic = false, ...raw } = req.body;

      // Size guard
      const rawSize = Buffer.byteLength(JSON.stringify(raw));
      if (rawSize > config.maxSnapshotSize) {
        return res.status(413).json({ error: `Snapshot too large (max ${config.maxSnapshotSize / 1024}KB)` });
      }

      const parsed = parseSnapshot(raw);
      const bridge = generateBridge(parsed);

      const snapshot = new Snapshot({
        owner: req.user._id,
        label: label || parsed.projectName || `Snapshot ${new Date().toISOString().slice(0, 10)}`,
        captureMethod: parsed.captureMethod || 'api',
        ...parsed,
        bridge,
        isPublic,
        rawPayload: raw,
      });

      await snapshot.save();
      req.user.snapshotsUploaded = (req.user.snapshotsUploaded || 0) + 1;
      await req.user.save();

      res.status(201).json({ snapshot });
    } catch (err) { next(err); }
  }
);

// GET /snapshots — list my snapshots
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const filter = { owner: req.user._id };
    if (req.query.search) filter.label = { $regex: req.query.search, $options: 'i' };

    const [snapshots, total] = await Promise.all([
      Snapshot.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-rawPayload -bridge'),
      Snapshot.countDocuments(filter),
    ]);

    res.json({ snapshots, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// GET /snapshots/public — publicly visible snapshots
router.get('/public', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const snapshots = await Snapshot.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-rawPayload -bridge -envVars')
      .populate('owner', 'username avatarUrl');
    const total = await Snapshot.countDocuments({ isPublic: true });
    res.json({ snapshots, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// GET /snapshots/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const snapshot = await Snapshot.findOne({ _id: req.params.id, owner: req.user._id });
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
    snapshot.views = (snapshot.views || 0) + 1;
    await snapshot.save();
    res.json({ snapshot });
  } catch (err) { next(err); }
});

// PATCH /snapshots/:id — update label / isPublic
router.patch('/:id',
  authenticate,
  [body('label').optional().isLength({ max: 120 }), body('isPublic').optional().isBoolean()],
  async (req, res, next) => {
    try {
      if (!ok(req, res)) return;
      const snapshot = await Snapshot.findOne({ _id: req.params.id, owner: req.user._id });
      if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
      const { label, isPublic } = req.body;
      if (label !== undefined) snapshot.label = label;
      if (isPublic !== undefined) snapshot.isPublic = isPublic;
      await snapshot.save();
      res.json({ snapshot });
    } catch (err) { next(err); }
  }
);

// DELETE /snapshots/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const snapshot = await Snapshot.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
    res.json({ message: 'Snapshot deleted' });
  } catch (err) { next(err); }
});

// GET /snapshots/:id/bridge — download bridge artifacts as JSON
router.get('/:id/bridge', authenticate, async (req, res, next) => {
  try {
    const snapshot = await Snapshot.findOne({ _id: req.params.id, owner: req.user._id }).select('bridge label projectName');
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
    if (!snapshot.bridge) return res.status(404).json({ error: 'No bridge artifacts generated yet' });

    const file = req.query.file; // ?file=dockerfile|setup.sh|.env.template|docker-compose.yml
    if (file === 'dockerfile') {
      res.setHeader('Content-Disposition', 'attachment; filename="Dockerfile"');
      res.setHeader('Content-Type', 'text/plain');
      return res.send(snapshot.bridge.dockerfile);
    }
    if (file === 'setup.sh') {
      res.setHeader('Content-Disposition', 'attachment; filename="setup.sh"');
      res.setHeader('Content-Type', 'text/plain');
      return res.send(snapshot.bridge.setupSh);
    }
    if (file === 'env.template') {
      res.setHeader('Content-Disposition', 'attachment; filename=".env.template"');
      res.setHeader('Content-Type', 'text/plain');
      return res.send(snapshot.bridge.envTemplate);
    }
    if (file === 'docker-compose.yml') {
      res.setHeader('Content-Disposition', 'attachment; filename="docker-compose.yml"');
      res.setHeader('Content-Type', 'text/plain');
      return res.send(snapshot.bridge.dockerCompose);
    }

    res.json({ bridge: snapshot.bridge });
  } catch (err) { next(err); }
});

// POST /snapshots/:idA/diff/:idB
router.post('/:idA/diff/:idB', authenticate, async (req, res, next) => {
  try {
    const [snapA, snapB] = await Promise.all([
      Snapshot.findOne({ _id: req.params.idA, owner: req.user._id }),
      Snapshot.findOne({ _id: req.params.idB, owner: req.user._id }),
    ]);
    if (!snapA) return res.status(404).json({ error: 'Snapshot A not found' });
    if (!snapB) return res.status(404).json({ error: 'Snapshot B not found' });

    const diff = diffSnapshots(snapA, snapB);
    res.json({ diff, snapshotA: { _id: snapA._id, label: snapA.label }, snapshotB: { _id: snapB._id, label: snapB.label } });
  } catch (err) { next(err); }
});

export default router;
