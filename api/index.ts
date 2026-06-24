// Vercel serverless function entry point
import { connectDB } from '../src/config/db';
import app from '../src/server';

// Connect to DB once on cold start
let isConnected = false;

export default async (req: any, res: any) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
    
    // Express app handles the request
    return app(req, res);
  } catch (error: any) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
