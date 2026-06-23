import { Router, Request, Response, NextFunction } from 'express';
import { builderLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { buildResume, BuilderInputSchema } from '../utils/resumeBuilder';
import ResumeBuilderModel from '../models/ResumeBuilderModel';
import { generateResumeHtml } from '../utils/htmlResumeTemplate';
import { htmlToPdf } from '../utils/pdfGenerator';

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
router.post(
  '/builder/compile-pdf',
  builderLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { resumeId } = req.body;

    if (!resumeId) {
      return next(new AppError(400, 'Resume ID is required'));
    }

    try {
      // Fetch resume data from database
      const resume = await ResumeBuilderModel.findById(resumeId);
      
      if (!resume) {
        return next(new AppError(404, 'Resume not found'));
      }

      // Generate HTML from resume data
      const html = generateResumeHtml({
        name: resume.name,
        phone: resume.phone,
        email: resume.email,
        linkedin: resume.linkedin,
        github: resume.github,
        leetcode: resume.leetcode,
        degree: resume.degree,
        institution: resume.institution,
        location: resume.location,
        graduationYear: resume.graduationYear,
        skills: resume.skills,
        summary: resume.summary,
        projects: resume.projects,
        achievements: resume.achievements,
      });

      // Convert HTML to PDF using Puppeteer
      const pdfBuffer = await htmlToPdf(html);

      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
      res.send(pdfBuffer);
      
      logger.info('PDF compiled successfully', { requestId: req.id, resumeId });
    } catch (err: any) {
      logger.error('PDF compilation error', { error: err.message });
      next(new AppError(500, 'Failed to compile PDF'));
    }
  },
);

export default router;
