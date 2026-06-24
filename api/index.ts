// Vercel serverless function entry point
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../src/config/db';
import app from '../src/server';

// Connect to DB once on cold start
let isConnected = false;

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
    
    // Express app handles the request
    return app(req as any, res as any);
  } catch (error: any) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
