import rateLimit, { Options } from 'express-rate-limit';
import { RATE_LIMIT } from '../config/constants';

const jsonMessage = { status: 'error', message: 'Too many requests. Please try again later.' };

// Use req.ip (normalised by Express) falling back to raw socket address.
// validate: false suppresses the ERR_ERL_KEY_GEN_IPV6 warning because we
// intentionally handle IPv6 addresses via req.ip which Express normalises.
const keyGenerator: Options['keyGenerator'] = (req) =>
  req.ip ?? req.socket.remoteAddress ?? 'unknown';

export const analyzeLimiter = rateLimit({
  windowMs: RATE_LIMIT.ANALYZE.windowMs,
  max: RATE_LIMIT.ANALYZE.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator,
  message: jsonMessage,
});

export const historyLimiter = rateLimit({
  windowMs: RATE_LIMIT.HISTORY.windowMs,
  max: RATE_LIMIT.HISTORY.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator,
  message: jsonMessage,
});

export const matchLimiter = rateLimit({
  windowMs: RATE_LIMIT.MATCH.windowMs,
  max: RATE_LIMIT.MATCH.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator,
  message: jsonMessage,
});

export const compareLimiter = rateLimit({
  windowMs: RATE_LIMIT.COMPARE.windowMs,
  max: RATE_LIMIT.COMPARE.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator,
  message: jsonMessage,
});

export const builderLimiter = rateLimit({
  windowMs: RATE_LIMIT.BUILDER.windowMs,
  max: RATE_LIMIT.BUILDER.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator,
  message: jsonMessage,
});

export const coverLetterLimiter = rateLimit({
  windowMs: RATE_LIMIT.COVER_LETTER.windowMs,
  max: RATE_LIMIT.COVER_LETTER.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator,
  message: jsonMessage,
});

export const linkedinLimiter = rateLimit({
  windowMs: RATE_LIMIT.LINKEDIN.windowMs,
  max: RATE_LIMIT.LINKEDIN.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator,
  message: jsonMessage,
});
