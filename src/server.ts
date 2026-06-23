// Load env first — everything else depends on it
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { env } from './config/env';
import { connectDB } from './config/db';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { logger } from './utils/logger';
import authRouter from './routes/authRoutes';
import analyzeRouter from './routes/analysisRoutes';
import jobMatchRouter from './routes/jobMatchRoutes';
import compareRouter from './routes/compareRoutes';
import builderRouter from './routes/builderRoutes';
import coverLetterRouter from './routes/coverLetterRoutes';
import linkedinRouter from './routes/linkedinRoutes';

const app = express();

// ── Trust proxy (required for rate limiter behind Nginx / load balancer) ──────
app.set('trust proxy', 1);

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(requestId);
app.use(cookieParser());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Request-Id', 'Authorization'],
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api', analyzeRouter);
app.use('/api', jobMatchRouter);
app.use('/api', compareRouter);
app.use('/api', builderRouter);
app.use('/api', coverLetterRouter);
app.use('/api', linkedinRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Error handlers (must be last) ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info('Server started', { port: env.PORT, environment: env.NODE_ENV });
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received — shutting down gracefully`);

    server.close(async () => {
      try {
        await mongoose.connection.close();
        logger.info('DB connection closed');
      } catch (err) {
        logger.error('Error closing DB connection', { err: String(err) });
      }
      process.exit(0);
    });

    // Force-kill after 10 s if the server hasn't drained
    setTimeout(() => {
      logger.error('Shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT',  () => { void shutdown('SIGINT');  });
}

// ── Safety net for programming errors ────────────────────────────────────────
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
  process.exit(1);
});

start().catch((err: Error) => {
  logger.error('Failed to start server', { message: err.message });
  process.exit(1);
});
