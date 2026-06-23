import { Analysis } from '../models/AnalysisModel';
import { PaginationMeta } from '../types/api';
import { AppError } from '../middleware/errorHandler';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

export interface HistoryPage {
  data: unknown[];
  pagination: PaginationMeta;
}

export async function getHistory(
  rawPage: unknown,
  rawLimit: unknown,
): Promise<HistoryPage> {
  const page = Math.max(DEFAULT_PAGE, Number(rawPage) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(rawLimit) || DEFAULT_LIMIT));

  const [data, total] = await Promise.all([
    Analysis.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v')
      .lean(),
    Analysis.countDocuments(),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getHistoryById(id: string): Promise<unknown> {
  let result: unknown;

  try {
    result = await Analysis.findById(id).select('-__v').lean();
  } catch {
    throw new AppError(400, 'Invalid ID format');
  }

  if (!result) throw new AppError(404, 'Analysis not found');

  return result;
}
