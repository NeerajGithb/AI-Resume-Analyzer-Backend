import type { AnalysisResult } from '../utils/resumeAnalyzer';

// ─── SSE event shapes ─────────────────────────────────────────────────────────
export type SseStage = 
  | 'uploading'    // Initial upload
  | 'parsing'      // PDF parsing
  | 'scoring'      // ATS scoring
  | 'keywords'     // Keyword analysis
  | 'suggestions'  // Generating improvements
  | 'finalizing'   // Saving to DB
  | 'matching'     // Job match
  | 'comparing'    // Resume compare
  | 'generating';  // Cover letter & builder

export interface SseAnalyzingEvent {
  status: 'analyzing';
  stage: SseStage;
}

export interface SseCompleteEvent {
  status: 'complete';
  data: unknown; // Allow any result type - each feature has its own
}

export interface SseErrorEvent {
  status: 'error';
  message: string;
  requestId?: string;
}

export type SseEvent = SseAnalyzingEvent | SseCompleteEvent | SseErrorEvent;

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}
