import dotenv from 'dotenv';
dotenv.config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/debugbridge',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'debugbridge-dev-secret-change-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'debugbridge-refresh-secret',
    refreshExpiresIn: '30d',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5174').split(','),
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 200,
  },

  // Max snapshot payload size (JSON bytes)
  maxSnapshotSize: parseInt(process.env.MAX_SNAPSHOT_SIZE || String(512 * 1024), 10),
};

export default config;
