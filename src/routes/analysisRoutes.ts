import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { runAnalysis } from '../services/resumeAnalysisService';
import { getHistory, getHistoryById } from '../services/analysisHistoryService';
import { analyzeLimiter, historyLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from '../config/constants';
import { SseEvent } from '../types/api';
import { logger } from '../utils/logger';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// ─── Multer ───────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    ACCEPTED_FILE_TYPES.includes(file.mimetype as 'application/pdf')
      ? cb(null, true)
      : cb(new Error('Only PDF files are accepted'));
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sendSse(res: Response, event: SseEvent): void {
  if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// ─── POST /api/analyze ────────────────────────────────────────────────────────
router.post(
  '/analyze',
  optionalAuth, // Get user ID if logged in, but don't require it
  analyzeLimiter,
  upload.single('resume'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) return next(new AppError(400, 'No file uploaded'));

    // Extract optional parameters
    const yearsOfExperience = req.body.yearsOfExperience 
      ? String(req.body.yearsOfExperience) 
      : undefined;
    const targetRole = req.body.targetRole 
      ? String(req.body.targetRole) 
      : undefined;

    // Switch to SSE streaming mode
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering
    res.flushHeaders();

    // Detect real client disconnect via the response stream
    let aborted = false;
    res.on('close', () => { aborted = true; });

    // Heartbeat keeps the connection alive through proxies / load balancers
    const heartbeat = setInterval(() => {
      if (!aborted && !res.writableEnded) res.write(': heartbeat\n\n');
    }, 15_000);

    try {
      const result = await runAnalysis(
        req.file.buffer,
        req.file.originalname,
        req.file.size,
        req.userId, // Pass user ID if authenticated
        (stage) => { if (!aborted) sendSse(res, { status: 'analyzing', stage }); },
        yearsOfExperience,
        targetRole,
      );

      if (!aborted) {
        sendSse(res, { status: 'complete', data: result });
        logger.info('Analysis complete', {
          requestId: req.id,
          file: req.file.originalname,
          score: result.overall_score,
          id: result.id,
          yearsOfExperience,
          targetRole,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      logger.error('Analysis failed', { requestId: req.id, err: message });
      if (!res.writableEnded) {
        sendSse(res, { status: 'error', message, requestId: req.id });
      }
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  },
);

// Multer error interceptor — must be right after the route
router.use(
  '/analyze',
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    const msg =
      err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? `File too large — maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`
        : err.message;
    res.status(400).json({ status: 'error', message: msg });
  },
);

// ─── GET /api/history ─────────────────────────────────────────────────────────
router.get(
  '/history',
  historyLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await getHistory(req.query.page, req.query.limit);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/history/:id ─────────────────────────────────────────────────────
router.get(
  '/history/:id',
  historyLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await getHistoryById(String(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
);

export default router;