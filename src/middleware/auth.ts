import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { verifyToken } from '../utils/auth';
import { UserModel } from '../models/UserModel';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.token;

    if (!token) {
      return next(new AppError(401, 'Authentication required'));
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Check if user exists
    const user = await UserModel.findById(decoded.userId).select('-password');
    if (!user) {
      return next(new AppError(401, 'User not found'));
    }

    // Attach user to request
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return next(new AppError(401, 'Invalid token'));
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return next(new AppError(401, 'Token expired'));
    }
    next(error);
  }
}

// Optional authentication - doesn't fail if no token
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.token;

    if (token) {
      const decoded = verifyToken(token);
      const user = await UserModel.findById(decoded.userId).select('-password');
      if (user) {
        req.userId = decoded.userId;
        req.user = user;
      }
    }
    next();
  } catch {
    // Silently fail - authentication is optional
    next();
  }
}
