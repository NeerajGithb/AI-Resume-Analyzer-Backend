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
  improvements: string[];
  keyword_optimization: {
    current_keywords: string[];
    suggested_keywords: string[];
  };
  headline_suggestions: string[];
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
  improvements: [{ type: String }],
  keyword_optimization: {
    current_keywords: [{ type: String }],
    suggested_keywords: [{ type: String }],
  },
  headline_suggestions: [{ type: String }],
  createdAt: { type: Date, default: Date.now, index: true },
});

export const LinkedIn = mongoose.model<ILinkedIn>('LinkedIn', LinkedInSchema);
