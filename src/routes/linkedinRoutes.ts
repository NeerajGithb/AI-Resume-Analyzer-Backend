import { Router, Request, Response, NextFunction } from 'express';
import { linkedinLimiter } from '../middleware/rateLimiter';
import { optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { SseEvent } from '../types/api';
import { logger } from '../utils/logger';
import { analyzeLinkedInProfile } from '../utils/linkedinAnalyzer';
import { LinkedIn } from '../models/LinkedInModel';

const router = Router();

// ─── SSE Helper ───────────────────────────────────────────────────────────────
function sendSse(res: Response, event: SseEvent): void {
  if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// Helper to add delays between stages for better UX
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── POST /api/linkedin/analyze ───────────────────────────────────────────────
router.post(
  '/linkedin/analyze',
  linkedinLimiter,
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.body.profileText) return next(new AppError(400, 'Profile text is required'));

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
      await delay(1000);
      
      const profileText = String(req.body.profileText);
      await delay(1200); // Pause to show parsing complete

      if (!aborted) sendSse(res, { status: 'analyzing', stage: 'scoring' });
      await delay(800);
      
      const result = await analyzeLinkedInProfile(profileText);
      await delay(1500); // Pause to show scoring complete

      if (!aborted) sendSse(res, { status: 'analyzing', stage: 'finalizing' });
      await delay(1200); // Pause to show finalizing
      
      // Save to database
      const saved = await LinkedIn.create({
        userId,
        ...result,
      });
      
      if (!aborted) {
        sendSse(res, { status: 'complete', data: { ...result, id: saved._id.toString() } });
        logger.info('LinkedIn profile analyzed', {
          requestId: req.id,
          score: result.overall_score,
          id: saved._id,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LinkedIn analysis failed';
      logger.error('LinkedIn analysis failed', { requestId: req.id, err: message });
      if (!res.writableEnded) {
        sendSse(res, { status: 'error', message, requestId: req.id });
      }
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  },
);

// ─── GET /api/linkedin/:id ────────────────────────────────────────────────────
router.get(
  '/linkedin/:id',
  linkedinLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const linkedin = await LinkedIn.findById(req.params.id);
      if (!linkedin) {
        return next(new AppError(404, 'LinkedIn analysis not found'));
      }
      res.json({ success: true, data: linkedin });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
