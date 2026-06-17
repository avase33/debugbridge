import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import config from './config/index.js';
import { connectDatabase } from './config/database.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import authRouter from './routes/auth.js';
import snapshotsRouter from './routes/snapshots.js';
import sessionsRouter from './routes/sessions.js';

const app = express();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ───────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
}));

// ── Body / Compression / Logging ────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'debugbridge-api', version: '1.0.0' }));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/sessions', sessionsRouter);

// ── Error handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Boot ────────────────────────────────────────────────────────────────────
async function start() {
  await connectDatabase();
  const server = app.listen(config.port, () => {
    console.log(`🔍 DebugBridge API running on port ${config.port} [${config.nodeEnv}]`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received — shutting down gracefully`);
    server.close(() => { console.log('HTTP server closed'); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => { console.error('Failed to start server:', err); process.exit(1); });
