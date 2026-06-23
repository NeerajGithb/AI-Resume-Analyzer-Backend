import mongoose, { Schema, Document } from 'mongoose';

export interface ILinkedIn extends Document {
  userId?: string;
  overall_score: number;
  grade: string;
  completeness: number;
  section_scores: Array<{
    section: string;
    score: number;
    status: string;
    feedback: string;
  }>;
  strengths: string[];
  improvements: Array<{
    priority: 'high' | 'medium' | 'low';
    section: string;
    recommendation: string;
  }>;
  keyword_optimization: number;
  missing_keywords: string[];
  headline_suggestions: string[];
  summary_feedback: string;
  createdAt: Date;
}

const LinkedInSchema = new Schema<ILinkedIn>({
  userId: { type: String, index: true },
  overall_score: { type: Number, required: true },
  grade: { type: String, required: true },
  completeness: { type: Number, required: true },
  section_scores: [{
    section: { type: String },
    score: { type: Number },
    status: { type: String },
    feedback: { type: String },
  }],
  strengths: [{ type: String }],
  improvements: [{
    priority: { type: String, enum: ['high', 'medium', 'low'] },
    section: { type: String },
    recommendation: { type: String },
  }],
  keyword_optimization: { type: Number, required: true },
  missing_keywords: [{ type: String }],
  headline_suggestions: [{ type: String }],
  summary_feedback: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const LinkedIn = mongoose.model<ILinkedIn>('LinkedIn', LinkedInSchema);
