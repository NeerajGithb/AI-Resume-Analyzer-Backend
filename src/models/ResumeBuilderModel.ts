import mongoose, { Schema, Document } from 'mongoose';

export interface IResumeBuilder extends Document {
  userId?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email: string;
  linkedin?: string;
  github?: string;
  leetcode?: string;
  degree: string;
  institution: string;
  location?: string;
  graduationYear?: string;
  skills: string;
  summary: string;
  projects: Array<{
    name: string;
    year: string;
    technologies: string;
    url?: string;
    bullets: string[];
  }>;
  achievements: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ResumeBuilderSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    linkedin: String,
    github: String,
    leetcode: String,
    degree: {
      type: String,
      required: true,
    },
    institution: {
      type: String,
      required: true,
    },
    location: String,
    graduationYear: String,
    skills: String,
    summary: {
      type: String,
      required: true,
    },
    projects: [{
      name: String,
      year: String,
      technologies: String,
      url: String,
      bullets: [String],
    }],
    achievements: [String],
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IResumeBuilder>('ResumeBuilder', ResumeBuilderSchema);
