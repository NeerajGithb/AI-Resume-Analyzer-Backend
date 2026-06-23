import { Router, Request, Response } from 'express';
import { Job } from '../models/JobModel';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/jobs - List all active jobs with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      department, 
      type, 
      location, 
      status = 'active',
      page = 1,
      limit = 10
    } = req.query;

    const filter: any = {};
    
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (type) filter.type = type;
    if (location) filter.location = new RegExp(location as string, 'i');

    const skip = (Number(page) - 1) * Number(limit);

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ postedDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-__v'),
      Job.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });

    logger.info('Jobs listed', {
      requestId: req.id,
      count: jobs.length,
      filters: filter
    });
  } catch (err) {
    logger.error('Jobs listing failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs'
    });
  }
});

// GET /api/jobs/:id - Get single job details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Increment view count
    job.viewsCount += 1;
    await job.save();

    res.json({
      success: true,
      data: job
    });

    logger.info('Job viewed', {
      requestId: req.id,
      jobId: id,
      title: job.title
    });
  } catch (err) {
    logger.error('Job fetch failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job'
    });
  }
});

// POST /api/jobs - Create new job (TODO: Add admin auth)
router.post('/', async (req: Request, res: Response) => {
  try {
    const jobData = req.body;

    // Validation
    const required = ['title', 'department', 'location', 'type', 'experience', 'description'];
    const missing = required.filter(field => !jobData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    const job = await Job.create(jobData);

    res.status(201).json({
      success: true,
      data: job,
      message: 'Job created successfully'
    });

    logger.info('Job created', {
      requestId: req.id,
      jobId: job._id,
      title: job.title
    });
  } catch (err) {
    logger.error('Job creation failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to create job'
    });
  }
});

// PUT /api/jobs/:id - Update job (TODO: Add admin auth)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const job = await Job.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job,
      message: 'Job updated successfully'
    });

    logger.info('Job updated', {
      requestId: req.id,
      jobId: id
    });
  } catch (err) {
    logger.error('Job update failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to update job'
    });
  }
});

// DELETE /api/jobs/:id - Soft delete job (TODO: Add admin auth)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await Job.findByIdAndUpdate(
      id,
      { status: 'closed', updatedAt: new Date() },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      message: 'Job closed successfully'
    });

    logger.info('Job closed', {
      requestId: req.id,
      jobId: id
    });
  } catch (err) {
    logger.error('Job deletion failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to close job'
    });
  }
});

export default router;
