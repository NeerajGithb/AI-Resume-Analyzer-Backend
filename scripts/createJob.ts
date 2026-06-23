// Script to create a job and get shareable link
// Usage: ts-node scripts/createJob.ts

import mongoose from 'mongoose';
import { Job } from '../src/models/JobModel';
import * as dotenv from 'dotenv';

dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const sampleJob = {
  title: 'Full Stack Developer',
  department: 'Engineering',
  location: 'Remote / Bangalore',
  type: 'Full-time' as const,
  experience: '2-4 years',
  description: `
    <h3>About the Role</h3>
    <p>We're looking for a talented Full Stack Developer to join our growing team and help build our AI-powered resume analysis platform.</p>
    
    <h3>What You'll Do</h3>
    <ul>
      <li>Build scalable features using React, Node.js, and MongoDB</li>
      <li>Work with AI/ML APIs to improve our analysis engine</li>
      <li>Collaborate with product and design teams</li>
      <li>Write clean, maintainable code with tests</li>
    </ul>
    
    <h3>What We Offer</h3>
    <ul>
      <li>Competitive salary (₹8-12 LPA)</li>
      <li>Remote flexibility</li>
      <li>Learning and development budget</li>
      <li>Stock options</li>
      <li>Great team culture</li>
    </ul>
  `,
  requirements: [
    '2-4 years of experience in full-stack development',
    'Strong proficiency in React and Node.js',
    'Experience with MongoDB or similar databases',
    'Understanding of RESTful APIs and microservices',
    'Good communication skills',
    'Bonus: Experience with Docker and AWS'
  ],
  skills: [
    'React',
    'Node.js',
    'TypeScript',
    'MongoDB',
    'Docker',
    'AWS',
    'Git',
    'REST APIs'
  ],
  salary: {
    min: 800000,
    max: 1200000,
    currency: 'INR'
  },
  status: 'active' as const
};

async function createJob() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    console.log('Creating job...');
    const job = await Job.create(sampleJob);
    console.log('✅ Job created successfully!\n');

    // Generate shareable links
    const jobUrl = `${FRONTEND_URL}/jobs/${job._id}`;
    const linkedInUrl = `${jobUrl}?source=linkedin`;
    const jobsPageUrl = `${FRONTEND_URL}/jobs`;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 JOB DETAILS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Title: ${job.title}`);
    console.log(`Department: ${job.department}`);
    console.log(`Location: ${job.location}`);
    console.log(`Job ID: ${job._id}`);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 SHAREABLE LINKS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📍 Direct Job Link:`);
    console.log(`   ${jobUrl}`);
    console.log(`\n💼 For LinkedIn Posts:`);
    console.log(`   ${linkedInUrl}`);
    console.log(`\n📋 All Jobs Page:`);
    console.log(`   ${jobsPageUrl}`);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 LINKEDIN POST TEMPLATE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`
🚀 We're Hiring: ${job.title}

📍 ${job.location}
💼 ${job.experience}
💰 ₹${(job.salary!.min / 100000).toFixed(0)}-${(job.salary!.max / 100000).toFixed(0)} LPA
🔧 ${job.skills.slice(0, 4).join(', ')}

Before applying, candidates must pass our AI-powered resume quality check (free!). 
This ensures quality applications and helps you improve your resume.

✅ ATS Score ≥ 70 required
✅ Instant feedback
✅ Improve your resume before applying

Apply here: ${linkedInUrl}

Our AI has helped 1,000+ candidates improve their resumes!

#hiring #${job.title.toLowerCase().replace(/\s+/g, '')} #jobs #ai #resumetips
    `);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createJob();
