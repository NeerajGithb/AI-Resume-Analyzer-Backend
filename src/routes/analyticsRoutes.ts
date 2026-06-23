import { Router, Request, Response } from 'express';
import { Application } from '../models/ApplicationModel';
import { Job } from '../models/JobModel';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/analytics/applications - Get application analytics
router.get('/applications', async (req: Request, res: Response) => {
  try {
    const { jobId, startDate, endDate } = req.query;

    const filter: any = {};
    if (jobId) filter.jobId = jobId;
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) filter.submittedAt.$gte = new Date(startDate as string);
      if (endDate) filter.submittedAt.$lte = new Date(endDate as string);
    }

    const [
      totalApplications,
      statusCounts,
      avgScore,
      scoreDistribution,
      topSkills
    ] = await Promise.all([
      // Total applications
      Application.countDocuments(filter),

      // Applications by status
      Application.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Average ATS score
      Application.aggregate([
        { $match: filter },
        { $group: { _id: null, avgScore: { $avg: '$resumeAnalysis.ats_score' } } }
      ]),

      // Score distribution
      Application.aggregate([
        { $match: filter },
        {
          $bucket: {
            groupBy: '$resumeAnalysis.ats_score',
            boundaries: [0, 50, 60, 70, 80, 90, 100],
            default: 'Other',
            output: { count: { $sum: 1 } }
          }
        }
      ]),

      // Top skills from applications
      Application.aggregate([
        { $match: filter },
        { $unwind: '$resumeAnalysis.sections' },
        { $match: { 'resumeAnalysis.sections.name': 'Skills' } },
        { $limit: 100 }
      ])
    ]);

    const analytics = {
      totalApplications,
      averageATSScore: avgScore[0]?.avgScore || 0,
      passRate: totalApplications > 0 
        ? ((await Application.countDocuments({ ...filter, 'resumeAnalysis.ats_score': { $gte: 70 } })) / totalApplications * 100).toFixed(2)
        : 0,
      statusBreakdown: statusCounts.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      scoreDistribution,
      recentTrend: {
        thisWeek: await Application.countDocuments({
          ...filter,
          submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }),
        lastWeek: await Application.countDocuments({
          ...filter,
          submittedAt: {
            $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        })
      }
    };

    res.json({
      success: true,
      data: analytics
    });

    logger.info('Analytics fetched', { requestId: req.id });
  } catch (err) {
    logger.error('Analytics fetch failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

// GET /api/analytics/jobs - Get job analytics
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const [
      totalJobs,
      activeJobs,
      totalViews,
      totalApplications,
      topJobs
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: 'active' }),
      Job.aggregate([
        { $group: { _id: null, totalViews: { $sum: '$viewsCount' } } }
      ]),
      Job.aggregate([
        { $group: { _id: null, totalApplications: { $sum: '$applicationsCount' } } }
      ]),
      Job.find({ status: 'active' })
        .sort({ applicationsCount: -1 })
        .limit(5)
        .select('title department applicationsCount viewsCount')
    ]);

    const analytics = {
      totalJobs,
      activeJobs,
      totalViews: totalViews[0]?.totalViews || 0,
      totalApplications: totalApplications[0]?.totalApplications || 0,
      topJobs
    };

    res.json({
      success: true,
      data: analytics
    });

    logger.info('Job analytics fetched', { requestId: req.id });
  } catch (err) {
    logger.error('Job analytics fetch failed', { requestId: req.id, error: err });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job analytics'
    });
  }
});

export default router;
