import mongoose, { Schema, Document } from 'mongoose';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface ISection {
  name: string;
  score: number;
  feedback: string;
}

interface IMissingKeywords {
  technical: string[];
  soft_skills: string[];
  industry: string[];
}

interface IImprovement {
  section: string;
  original: string;
  rewrite: string;
  reason: string;
}

export interface IAnalysis extends Document {
  userId?: mongoose.Types.ObjectId; // Optional - for authenticated users
  fileName: string;
  fileSize: number;
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  sections: ISection[];
  missing_keywords: IMissingKeywords;
  improvements: IImprovement[];
  tone_feedback: string;
  ats_tips: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const AnalysisSchema = new Schema<IAnalysis>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Optional user link
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    fileSize: { type: Number, required: true, min: 0 },
    overall_score: { type: Number, required: true, min: 0, max: 100 },
    grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'], required: true },
    sections: [
      {
        name: { type: String, required: true },
        score: { type: Number, required: true, min: 0, max: 100 },
        feedback: { type: String, required: true },
      },
    ],
    missing_keywords: {
      technical: [{ type: String }],
      soft_skills: [{ type: String }],
      industry: [{ type: String }],
    },
    improvements: [
      {
        section: { type: String, required: true },
        original: { type: String, required: true },
        rewrite: { type: String, required: true },
        reason: { type: String, required: true },
      },
    ],
    tone_feedback: { type: String, required: true },
    ats_tips: [{ type: String }],
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
    versionKey: false, // removes __v
  },
);

// Index for sorted history queries
AnalysisSchema.index({ createdAt: -1 });
AnalysisSchema.index({ userId: 1, createdAt: -1 }); // For user-specific queries

export const Analysis = mongoose.model<IAnalysis>('Analysis', AnalysisSchema);
