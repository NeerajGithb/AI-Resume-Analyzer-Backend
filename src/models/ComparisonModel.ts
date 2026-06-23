import mongoose, { Schema, Document } from 'mongoose';

export interface IComparison extends Document {
  userId?: string;
  file1Name: string;
  file2Name: string;
  file1Size: number;
  file2Size: number;
  winner: number;
  verdict: string;
  resume1_score: number;
  resume1_grade: string;
  resume1_strengths: string[];
  resume1_weaknesses: string[];
  resume2_score: number;
  resume2_grade: string;
  resume2_strengths: string[];
  resume2_weaknesses: string[];
  criteria: Array<{
    name: string;
    resume1: number;
    resume2: number;
    notes: string;
  }>;
  createdAt: Date;
}

const ComparisonSchema = new Schema<IComparison>({
  userId: { type: String, index: true },
  file1Name: { type: String, required: true },
  file2Name: { type: String, required: true },
  file1Size: { type: Number, required: true },
  file2Size: { type: Number, required: true },
  winner: { type: Number, required: true },
  verdict: { type: String, required: true },
  resume1_score: { type: Number, required: true },
  resume1_grade: { type: String, required: true },
  resume1_strengths: [{ type: String }],
  resume1_weaknesses: [{ type: String }],
  resume2_score: { type: Number, required: true },
  resume2_grade: { type: String, required: true },
  resume2_strengths: [{ type: String }],
  resume2_weaknesses: [{ type: String }],
  criteria: [{
    name: { type: String },
    resume1: { type: Number },
    resume2: { type: Number },
    notes: { type: String },
  }],
  createdAt: { type: Date, default: Date.now, index: true },
});

export const Comparison = mongoose.model<IComparison>('Comparison', ComparisonSchema);
