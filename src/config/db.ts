import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });
  logger.info('MongoDB connected');
}

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
mongoose.connection.on('error', (err: Error) =>
  logger.error('MongoDB error', { err: err.message }),
);
