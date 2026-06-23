import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { compareLimiter } from '../middleware/rateLimiter';
import { optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from '../config/constants';
import { SseEvent } from '../types/api';
import { logger } from '../utils/logger';
import { extractTextFromPDF } from '../utils/pdfParser';
import { compareResumes } from '../utils/resumeComparer';
import { Comparison } from '../models/ComparisonModel';

const router = Router();

// ─── Multer (accepts 2 files) ─────────────────────────────────────────────────
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

// ─── POST /api/compare ────────────────────────────────────────────────────────
router.post(
  '/compare',
  compareLimiter,
  optionalAuth,
  upload.fields([
    { name: 'resume1', maxCount: 1 },
    { name: 'resume2', maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    if (!files?.resume1?.[0]) return next(new AppError(400, 'Resume 1 is required'));
    if (!files?.resume2?.[0]) return next(new AppError(400, 'Resume 2 is required'));

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
      if (!aborted) sendSse(res, { status: 'analyzing', stage: 'parsing' });
      await delay(800);
      
      const text1 = await extractTextFromPDF(files.resume1[0].buffer);
      const text2 = await extractTextFromPDF(files.resume2[0].buffer);
      await delay(1500); // Pause to show parsing complete

      if (!aborted) sendSse(res, { status: 'analyzing', stage: 'comparing' });
      await delay(800);
      
      const result = await compareResumes(text1, text2);
      await delay(1500); // Pause to show comparing complete

      if (!aborted) sendSse(res, { status: 'analyzing', stage: 'finalizing' });
      await delay(1200); // Pause to show finalizing
      
      // Save to database
      const saved = await Comparison.create({
        userId,
        file1Name: files.resume1[0].originalname,
        file2Name: files.resume2[0].originalname,
        file1Size: files.resume1[0].size,
        file2Size: files.resume2[0].size,
        ...result,
      });
      
      if (!aborted) {
        sendSse(res, { status: 'complete', data: { ...result, id: saved._id.toString() } });
        logger.info('Resume comparison complete', {
          requestId: req.id,
          file1: files.resume1[0].originalname,
          file2: files.resume2[0].originalname,
          winner: result.winner,
          id: saved._id,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Comparison failed';
      logger.error('Resume comparison failed', { requestId: req.id, err: message });
      if (!res.writableEnded) {
        sendSse(res, { status: 'error', message, requestId: req.id });
      }
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  },
);

// ─── GET /api/compare/:id ─────────────────────────────────────────────────────
router.get(
  '/compare/:id',
  compareLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comparison = await Comparison.findById(req.params.id);
      if (!comparison) {
        return next(new AppError(404, 'Comparison not found'));
      }
      res.json({ success: true, data: comparison });
    } catch (err) {
      next(err);
    }
  },
);

// Multer error handler
router.use(
  '/compare',
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    const msg =
      err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? `File too large — maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`
        : err.message;
    res.status(400).json({ status: 'error', message: msg });
  },
);

export default router;
