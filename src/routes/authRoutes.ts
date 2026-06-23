import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserModel } from '../models/UserModel';
import { AppError } from '../middleware/errorHandler';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post(
  '/signup',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new AppError(
            400,
            parsed.error.issues.map((i) => i.message).join(', ')
          )
        );
      }

      const { name, email, password } = parsed.data;

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return next(new AppError(409, 'Email already registered'));
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await UserModel.create({
        name,
        email,
        password: hashedPassword,
      });

      // Generate token
      const token = generateToken(user._id.toString());

      logger.info('User signed up', { userId: user._id, email });

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new AppError(
            400,
            parsed.error.issues.map((i) => i.message).join(', ')
          )
        );
      }

      const { email, password } = parsed.data;

      // Find user (include password field)
      const user = await UserModel.findOne({ email }).select('+password');
      if (!user) {
        return next(new AppError(401, 'Invalid email or password'));
      }

      // Check password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return next(new AppError(401, 'Invalid email or password'));
      }

      // Generate token
      const token = generateToken(user._id.toString());

      logger.info('User logged in', { userId: user._id, email });

      res.json({
        success: true,
        message: 'Logged in successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user) {
        return next(new AppError(404, 'User not found'));
      }

      res.json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    logger.info('User logged out', { userId: req.userId });
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
);

export default router;
