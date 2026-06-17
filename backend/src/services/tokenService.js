import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export const signAccessToken = (userId) =>
  jwt.sign({ sub: userId, type: 'access' }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

export const signRefreshToken = (userId) =>
  jwt.sign({ sub: userId, type: 'refresh' }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });

export const verifyRefreshToken = (token) =>
  jwt.verify(token, config.jwt.refreshSecret);

export const issueTokenPair = (userId) => ({
  accessToken: signAccessToken(userId),
  refreshToken: signRefreshToken(userId),
  tokenType: 'Bearer',
  expiresIn: config.jwt.expiresIn,
});
