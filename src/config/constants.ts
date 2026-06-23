// Application-level constants (not environment-specific)

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_FILE_TYPES = ['application/pdf'] as const;
export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export const RATE_LIMIT = {
  ANALYZE:      { windowMs: 15 * 60 * 1000, max: 20  },
  HISTORY:      { windowMs: 15 * 60 * 1000, max: 200 },
  MATCH:        { windowMs: 15 * 60 * 1000, max: 20  },
  COMPARE:      { windowMs: 15 * 60 * 1000, max: 15  }, // 2 AI calls per request
  BUILDER:      { windowMs: 15 * 60 * 1000, max: 30  }, // lighter AI call
  COVER_LETTER: { windowMs: 15 * 60 * 1000, max: 20  },
  LINKEDIN:     { windowMs: 15 * 60 * 1000, max: 20  },
} as const;
