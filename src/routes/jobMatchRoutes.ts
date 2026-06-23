import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { matchLimiter } from '../middleware/rateLimiter';
import { optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from '../config/constants';
import { SseEvent } from '../types/api';
import { logger } from '../utils/logger';
import { extractTextFromPDF } from '../utils/pdfParser';
import { matchResumeToJob } from '../utils/jobMatcher';
import { JobMatch } from '../models/JobMatchModel';

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

// ─── SSE Helper ───────────────────────────────────────────────────────────────
function sendSse(res: Response, event: SseEvent): void {
  if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// Helper to add delays between stages for better UX
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── POST /api/match ──────────────────────────────────────────────────────────
router.post(
  '/match',
  matchLimiter,
  optionalAuth,
  upload.single('resume'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) return next(new AppError(400, 'No resume file uploaded'));
    if (!req.body.jobDescription) return next(new AppError(400, 'Job description is required'));

    const userId = req.user?.id;

    // SSE mode
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let aborted = false;
    res.on('close', () => { aborted = true; });

    const heartbeat = setInterval(() => {
      if (!aborted && !res.writableEnded) res.write(': heartbeat\n\n');
    }, 15_000);

    try {
      const jobDescription = String(req.body.jobDescription);
      
      if (!aborted) sendSse(res, { status: 'analyzing', stage: 'parsing' });
      await delay(800);
      
      const resumeText = await extractTextFromPDF(req.file.buffer);
      await delay(1500); // Pause to show parsing complete

      if (!aborted) sendSse(res, { status: 'analyzing', stage: 'matching' });
      await delay(800);
      
      const result = await matchResumeToJob(resumeText, jobDescription);
      await delay(1500); // Pause to show matching complete

      if (!aborted) sendSse(res, { status: 'analyzing', stage: 'finalizing' });
      await delay(1200); // Pause to show finalizing
      
      // Save to database
      const saved = await JobMatch.create({
        userId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        ...result,
      });
      
      if (!aborted) {
        sendSse(res, { status: 'complete', data: { ...result, id: saved._id.toString() } });
        logger.info('Job match complete', {
          requestId: req.id,
          file: req.file.originalname,
          score: result.match_score,
          id: saved._id,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Job matching failed';
      logger.error('Job match failed', { requestId: req.id, err: message });
      if (!res.writableEnded) {
        sendSse(res, { status: 'error', message, requestId: req.id });
      }
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  },
);

// ─── GET /api/match/:id ───────────────────────────────────────────────────────
router.get(
  '/match/:id',
  matchLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const match = await JobMatch.findById(req.params.id);
      if (!match) {
        return next(new AppError(404, 'Job match not found'));
      }
      res.json({ success: true, data: match });
    } catch (err) {
      next(err);
    }
  },
);

// Multer error handler
router.use(
  '/match',
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    const msg =
      err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? `File too large — maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`
        : err.message;
    res.status(400).json({ status: 'error', message: msg });
  },
);

export default router;
