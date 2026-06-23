import mongoose, { Schema, Document } from 'mongoose';

export interface ICoverLetter extends Document {
  userId?: string;
  fileName: string;
  fileSize: number;
  companyName: string;
  tone: string;
  cover_letter: string;
  word_count: number;
  key_highlights: string[];
  createdAt: Date;
}

const CoverLetterSchema = new Schema<ICoverLetter>({
  userId: { type: String, index: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  companyName: { type: String, required: true },
  tone: { type: String, required: true },
  cover_letter: { type: String, required: true },
  word_count: { type: Number, required: true },
  key_highlights: [{ type: String }],
  createdAt: { type: Date, default: Date.now, index: true },
});

export const CoverLetter = mongoose.model<ICoverLetter>('CoverLetter', CoverLetterSchema);
