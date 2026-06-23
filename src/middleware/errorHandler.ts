import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// ─── AppError ────────────────────────────────────────────────────────────────
// Throw this anywhere in the stack to produce a clean HTTP error response.
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Global error handler ─────────────────────────────────────────────────────
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isOperational = err instanceof AppError && err.isOperational;

  // Always log server errors; log operational errors at warn level.
  if (!isOperational) {
    logger.error('Unhandled error', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode,
      message: err.message,
      stack: err.stack,
    });
  } else {
    logger.warn('Request error', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode,
      message: err.message,
    });
  }

  if (res.headersSent) return;

  res.status(statusCode).json({
    status: 'error',
    message:
      isOperational || env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error',
    requestId: req.id,
  });
}
