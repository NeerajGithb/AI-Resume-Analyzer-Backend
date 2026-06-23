import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  jobId: mongoose.Types.ObjectId;
  candidateInfo: {
    name: string;
    email: string;
    phone: string;
    linkedin?: string;
    portfolio?: string;
  };
  resumeAnalysis: {
    fileName: string;
    fileSize: number;
    ats_score: number;
    grade: string;
    overall_score: number;
    sections: any[];
    missing_keywords: any;
    improvements: any[];
    tone_feedback: string;
    ats_tips: string[];
    analyzedAt: Date;
  };
  status: 'submitted' | 'screening' | 'shortlisted' | 'rejected' | 'interview' | 'hired';
  stage?: string;
  submittedAt: Date;
  lastUpdated: Date;
  notes: string[];
  source?: string;
  deviceInfo?: any;
  ipAddress?: string;
}

const ApplicationSchema = new Schema<IApplication>({
  jobId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Job',
    required: true,
    index: true
  },
  candidateInfo: {
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    email: { 
      type: String, 
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: { 
      type: String, 
      required: true,
      trim: true
    },
    linkedin: { 
      type: String,
      trim: true
    },
    portfolio: { 
      type: String,
      trim: true
    }
  },
  resumeAnalysis: {
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    ats_score: { type: Number, required: true, index: true },
    grade: { type: String, required: true },
    overall_score: { type: Number, required: true },
    sections: [{ type: Schema.Types.Mixed }],
    missing_keywords: { type: Schema.Types.Mixed },
    improvements: [{ type: Schema.Types.Mixed }],
    tone_feedback: { type: String },
    ats_tips: [{ type: String }],
    analyzedAt: { type: Date, default: Date.now }
  },
  status: {
    type: String,
    required: true,
    enum: ['submitted', 'screening', 'shortlisted', 'rejected', 'interview', 'hired'],
    default: 'submitted',
    index: true
  },
  stage: {
    type: String
  },
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: [{
    type: String
  }],
  source: {
    type: String,
    enum: ['linkedin', 'website', 'referral', 'other'],
    default: 'website'
  },
  deviceInfo: {
    type: Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ApplicationSchema.index({ jobId: 1, submittedAt: -1 });
ApplicationSchema.index({ status: 1, submittedAt: -1 });
ApplicationSchema.index({ 'candidateInfo.email': 1, jobId: 1 }, { unique: true });
ApplicationSchema.index({ 'resumeAnalysis.ats_score': 1 });

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);
