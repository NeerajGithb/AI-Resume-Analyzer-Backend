// Vercel serverless function entry point
import { connectDB } from '../src/config/db';
import app from '../src/server';

// Connect to DB once on cold start
let isConnected = false;

export default async (req: any, res: any) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  
  return app(req, res);
};
