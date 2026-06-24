import { Router, Request, Response, NextFunction } from 'express';
import { builderLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { buildResume, BuilderInputSchema } from '../utils/resumeBuilder';
import ResumeBuilderModel from '../models/ResumeBuilderModel';

const router = Router();

// ─── POST /api/builder/generate ───────────────────────────────────────────────
router.post(
  '/builder/generate',
  builderLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const parsed = BuilderInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new AppError(
            400,
            `Invalid input: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
          ),
        );
      }

      // Generate resume content using AI
      const aiResult = await buildResume(parsed.data);

      // Save to database
      const resume = await ResumeBuilderModel.create({
        ...parsed.data,
        summary: aiResult.summary,
        projects: aiResult.projects,
        achievements: aiResult.achievements,
        userId: (req as any).user?.id || null,
      });

      logger.info('Resume generated and saved', {
        requestId: req.id,
        resumeId: resume._id,
        name: parsed.data.name,
      });

      res.json({
        success: true,
        data: {
          id: resume._id,
          createdAt: resume.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/builder/:id ─────────────────────────────────────────────────────
router.get(
  '/builder/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resume = await ResumeBuilderModel.findById(req.params.id);

      if (!resume) {
        return next(new AppError(404, 'Resume not found'));
      }

      res.json({
        success: true,
        data: {
          id: resume._id,
          name: resume.name,
          summary: resume.summary,
          projects: resume.projects,
          achievements: resume.achievements,
          createdAt: resume.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/builder/compile-pdf ────────────────────────────────────────────
// PDF generation removed - feature not needed
router.post(
  '/builder/compile-pdf',
  builderLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return next(new AppError(410, 'PDF generation feature has been removed'));
  },
);

export default router;
