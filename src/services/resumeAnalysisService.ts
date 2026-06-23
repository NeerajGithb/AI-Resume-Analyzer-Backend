import { extractTextFromPDF } from '../utils/pdfParser';
import { analyzeResume, AnalysisResult } from '../utils/resumeAnalyzer';
import { Analysis } from '../models/AnalysisModel';
import { logger } from '../utils/logger';
import { SseStage } from '../types/api';

export type OnStage = (stage: SseStage) => void;

/**
 * Helper to add a delay between stages for better UX
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Orchestrates the full resume analysis pipeline:
 *   1. Extract text from PDF buffer
 *   2. Send text to AI for scoring
 *   3. Persist result to DB and return with ID
 *
 * `onStage` is called before each stage begins so the caller can
 * stream SSE progress events without this service knowing about HTTP.
 */
export async function runAnalysis(
  fileBuffer: Buffer,
  fileName: string,
  fileSize: number,
  userId: string | undefined,
  onStage: OnStage,
  yearsOfExperience?: string,
  targetRole?: string,
): Promise<AnalysisResult & { id: string }> {
  // Stage 1: Uploading (show immediately)
  onStage('uploading');
  await delay(800); // Show stage briefly
  
  // Stage 2: Parsing
  onStage('parsing');
  await delay(600); // Show parsing starting
  const resumeText = await extractTextFromPDF(fileBuffer);
  logger.info('PDF parsed', { fileName, chars: resumeText.length });
  await delay(1200); // Pause to show completion before next stage

  // Stage 3: Scoring
  onStage('scoring');
  await delay(600); // Show scoring starting
  const result = await analyzeResume(resumeText, yearsOfExperience, targetRole);
  logger.info('AI analysis complete', {
    fileName,
    score: result.overall_score,
    grade: result.grade,
    yearsOfExperience,
    targetRole,
  });
  await delay(1200); // Pause to show completion before next stage

  // Stage 4: Keywords
  onStage('keywords');
  await delay(1500); // Show this stage working

  // Stage 5: Suggestions
  onStage('suggestions');
  await delay(1500); // Show this stage working

  // Stage 6: Finalizing
  onStage('finalizing');
  await delay(800); // Show finalizing starting
  
  // Save to database and return the ID
  const savedAnalysis = await Analysis.create({ 
    userId, 
    fileName, 
    fileSize, 
    ...result 
  });

  logger.info('Analysis saved to DB', { 
    fileName, 
    id: savedAnalysis._id,
    userId 
  });

  await delay(800); // Final pause before completion

  return {
    ...result,
    id: savedAnalysis._id.toString(),
  };
}
