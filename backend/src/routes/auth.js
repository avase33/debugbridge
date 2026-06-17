import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { issueTokenPair, verifyRefreshToken, signAccessToken } from '../services/tokenService.js';

const router = Router();

function ok(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Validation failed', errors: errors.array() }); return false; }
  return true;
}

// POST /auth/register
router.post('/register',
  [body('email').isEmail().normalizeEmail(), body('username').isAlphanumeric().isLength({ min: 3, max: 32 }), body('password').isLength({ min: 8 })],
  async (req, res, next) => {
    try {
      if (!ok(req, res)) return;
      const { email, username, password, fullName } = req.body;
      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if (exists) return res.status(409).json({ error: exists.email === email ? 'Email taken' : 'Username taken' });
      const user = new User({ email, username, fullName, passwordHash: password });
      await user.save();
      res.status(201).json({ user, ...issueTokenPair(user._id) });
    } catch (err) { next(err); }
  }
);

// POST /auth/login
router.post('/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res, next) => {
    try {
      if (!ok(req, res)) return;
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+passwordHash');
      if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: 'Invalid credentials' });
      if (!user.isActive) return res.status(403).json({ error: 'Account inactive' });
      res.json({ user, ...issueTokenPair(user._id) });
    } catch (err) { next(err); }
  }
);

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    let payload;
    try { payload = verifyRefreshToken(refreshToken); } catch { return res.status(401).json({ error: 'Invalid refresh token' }); }
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ error: 'User not found' });
    res.json({ accessToken: signAccessToken(user._id), tokenType: 'Bearer' });
  } catch (err) { next(err); }
});

// GET /auth/me
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

// PATCH /auth/me
router.patch('/me', authenticate,
  [body('fullName').optional().isLength({ max: 128 })],
  async (req, res, next) => {
    try {
      if (!ok(req, res)) return;
      const { fullName, avatarUrl } = req.body;
      if (fullName !== undefined) req.user.fullName = fullName;
      if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;
      await req.user.save();
      res.json({ user: req.user });
    } catch (err) { next(err); }
  }
);

export default router;
