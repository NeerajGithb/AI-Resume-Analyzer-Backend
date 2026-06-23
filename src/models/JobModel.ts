import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  experience: string;
  description: string;
  requirements: string[];
  skills: string[];
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  status: 'active' | 'closed' | 'draft';
  postedBy?: string;
  postedDate: Date;
  closingDate?: Date;
  applicationsCount: number;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>({
  title: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  department: { 
    type: String, 
    required: true,
    trim: true
  },
  location: { 
    type: String, 
    required: true,
    trim: true
  },
  type: { 
    type: String, 
    required: true,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship']
  },
  experience: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true
  },
  requirements: [{ 
    type: String 
  }],
  skills: [{ 
    type: String 
  }],
  salary: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'USD' }
  },
  status: { 
    type: String, 
    required: true,
    enum: ['active', 'closed', 'draft'],
    default: 'active',
    index: true
  },
  postedBy: { 
    type: String 
  },
  postedDate: { 
    type: Date, 
    default: Date.now 
  },
  closingDate: { 
    type: Date 
  },
  applicationsCount: { 
    type: Number, 
    default: 0 
  },
  viewsCount: { 
    type: Number, 
    default: 0 
  }
}, {
  timestamps: true
});

// Indexes for better query performance
JobSchema.index({ status: 1, postedDate: -1 });
JobSchema.index({ department: 1, status: 1 });
JobSchema.index({ type: 1, status: 1 });

export const Job = mongoose.model<IJob>('Job', JobSchema);
