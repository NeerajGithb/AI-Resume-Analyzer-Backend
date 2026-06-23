import { Router, Request, Response } from 'express';
import multer from 'multer';
import { Application } from '../models/ApplicationModel';
import { Job } from '../models/JobModel';
import { analyzeResume } from '../utils/resumeAnalyzer';
import { extractTextFromPDF } from '../utils/pdfParser';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// POST /api/applications/pre-check - Analyze resume before submission
router.post('/pre-check', upload.single('resume'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resume file is required'
      });
    }

    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID is required'
      });
    }

    // Check if job exists and is active
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications'
      });
    }

    // Parse and analyze resume
    const resumeText = await extractTextFromPDF(req.file.buffer);
    const analysis = await analyzeResume(resumeText);

    const result = {
      canSubmit: analysis.overall_score >= 70,
      requiredScore: 70,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      ...analysis,
      message: analysis.overall_score >= 70
        ? 'Your resume meets our standards!'
        : 'Your resume needs improvement to meet our minimum requirements'
    };

    res.json({
      success: true,
      data: result
    });

    logger.info('Resume pre-check completed', {
      requestId: req.id,
      jobId,
      overall_score: analysis.overall_score,
      canSubmit: result.canSubmit,
      fileName: req.file.originalname
    });
  } catch (err) {
    logger.error('Resume pre-check failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to analyze resume'
    });
  }
});

// POST /api/applications/submit - Submit job application
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { jobId, candidateInfo, resumeAnalysis, source } = req.body;

    // Validation
    if (!jobId || !candidateInfo || !resumeAnalysis) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate ATS score requirement
    if (resumeAnalysis.overall_score < 70) {
      return res.status(400).json({
        success: false,
        message: 'Resume ATS score must be at least 70 to apply. Please improve your resume and try again.'
      });
    }

    // Check if job exists and is active
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications'
      });
    }

    // Check for duplicate application
    const existingApplication = await Application.findOne({
      jobId,
      'candidateInfo.email': candidateInfo.email
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this position'
      });
    }

    // Create application
    const application = await Application.create({
      jobId,
      candidateInfo,
      resumeAnalysis: {
        ...resumeAnalysis,
        analyzedAt: new Date()
      },
      status: 'submitted',
      submittedAt: new Date(),
      lastUpdated: new Date(),
      source: source || 'website',
      ipAddress: req.ip
    });

    // Increment job applications count
    job.applicationsCount += 1;
    await job.save();

    res.status(201).json({
      success: true,
      data: {
        applicationId: application._id,
        jobTitle: job.title,
        submittedAt: application.submittedAt
      },
      message: 'Application submitted successfully'
    });

    logger.info('Application submitted', {
      requestId: req.id,
      applicationId: application._id,
      jobId,
      email: candidateInfo.email,
      overall_score: resumeAnalysis.overall_score
    });
  } catch (err: any) {
    logger.error('Application submission failed', { requestId: req.id, error: err });
    
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this position'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit application'
    });
  }
});

// GET /api/applications/job/:jobId - Get all applications for a job (Admin)
router.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { 
      status, 
      minScore, 
      maxScore,
      page = 1,
      limit = 20,
      sortBy = 'submittedAt',
      order = 'desc'
    } = req.query;

    const filter: any = { jobId };
    
    if (status) filter.status = status;
    if (minScore) filter['resumeAnalysis.overall_score'] = { $gte: Number(minScore) };
    if (maxScore) {
      filter['resumeAnalysis.overall_score'] = filter['resumeAnalysis.overall_score'] || {};
      filter['resumeAnalysis.overall_score'].$lte = Number(maxScore);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === 'desc' ? -1 : 1;

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .sort({ [sortBy as string]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .select('-__v'),
      Application.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: applications,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });

    logger.info('Applications fetched', {
      requestId: req.id,
      jobId,
      count: applications.length
    });
  } catch (err) {
    logger.error('Applications fetch failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications'
    });
  }
});

// GET /api/applications/:id - Get single application details (Admin)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id).populate('jobId', 'title department');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: application
    });

    logger.info('Application viewed', {
      requestId: req.id,
      applicationId: id
    });
  } catch (err) {
    logger.error('Application fetch failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application'
    });
  }
});

// PUT /api/applications/:id/status - Update application status (Admin)
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, stage, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const updates: any = {
      status,
      lastUpdated: new Date()
    };

    if (stage) updates.stage = stage;
    if (note) updates.$push = { notes: note };

    const application = await Application.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: application,
      message: 'Application status updated successfully'
    });

    logger.info('Application status updated', {
      requestId: req.id,
      applicationId: id,
      status
    });
  } catch (err) {
    logger.error('Application status update failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to update application status'
    });
  }
});

export default router;
