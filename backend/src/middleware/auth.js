import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import config from '../config/index.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      return res.status(401).json({
        error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
        code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      });
    }
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  return authenticate(req, res, next);
}
