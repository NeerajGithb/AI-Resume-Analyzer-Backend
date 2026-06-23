import mongoose, { Schema, Document } from 'mongoose';

export interface IJobMatch extends Document {
  userId?: string;
  fileName: string;
  fileSize: number;
  match_score: number;
  match_grade: string;
  matched_keywords: string[];
  missing_keywords: string[];
  matched_requirements: string[];
  missing_requirements: string[];
  recommendations: Array<{
    priority: string;
    action: string;
    reason: string;
  }>;
  overall_verdict: string;
  createdAt: Date;
}

const JobMatchSchema = new Schema<IJobMatch>({
  userId: { type: String, index: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  match_score: { type: Number, required: true },
  match_grade: { type: String, required: true },
  matched_keywords: [{ type: String }],
  missing_keywords: [{ type: String }],
  matched_requirements: [{ type: String }],
  missing_requirements: [{ type: String }],
  recommendations: [{
    priority: { type: String },
    action: { type: String },
    reason: { type: String },
  }],
  overall_verdict: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const JobMatch = mongoose.model<IJobMatch>('JobMatch', JobMatchSchema);
