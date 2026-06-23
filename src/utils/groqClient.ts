import Groq from 'groq-sdk';
import type { ZodSchema } from 'zod';
import { GROQ_MODEL } from '../config/constants';
import { AppError } from '../middleware/errorHandler';
import { logger } from './logger';

// ─── Singleton Groq client ─────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Options ──────────────────────────────────────────────────────────────────
export interface GroqCallOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  model?: string;
}

const DEFAULTS: Required<GroqCallOptions> = {
  temperature: 0.2,
  maxTokens: 4096,
  timeoutMs: 45_000,
  maxAttempts: 2,
  model: GROQ_MODEL,
};

/**
 * Shared Groq caller with:
 *  - JSON mode enforced (response_format: json_object)
 *  - Zod schema validation
 *  - Configurable retry + timeout
 *  - Consistent AppError on failure
 *
 * All AI utility modules import this instead of creating their own Groq instances.
 */
export async function callGroqJson<T>(
  schema: ZodSchema<T>,
  systemPrompt: string,
  userPrompt: string,
  options: GroqCallOptions = {},
): Promise<T> {
  const { temperature, maxTokens, timeoutMs, maxAttempts, model } = {
    ...DEFAULTS,
    ...options,
  };

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info('Calling Groq API', { model, promptChars: userPrompt.length, attempt });

      const completion = await Promise.race([
        groq.chat.completions.create({
          model,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Groq timed out after ${timeoutMs / 1000}s`)),
            timeoutMs,
          ),
        ),
      ]);

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from AI');

      const parsed = JSON.parse(content) as unknown;
      const validated = schema.safeParse(parsed);

      if (!validated.success) {
        logger.warn('AI schema mismatch', {
          attempt,
          issues: validated.error.issues.map((i) => i.message),
        });
        if (attempt === maxAttempts) {
          throw new AppError(502, 'AI returned an unexpected format. Please try again.');
        }
        continue; // retry
      }

      return validated.data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.error('Groq attempt failed', { attempt, err: lastError.message });
      if (attempt === maxAttempts) break;
    }
  }

  if (lastError instanceof AppError) throw lastError;
  throw new AppError(502, `AI service error: ${lastError?.message ?? 'Unknown error'}`);
}
