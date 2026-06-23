import Groq from 'groq-sdk';
import { z } from 'zod';
import { GROQ_MODEL } from '../config/constants';
import { logger } from './logger';
import { AppError } from '../middleware/errorHandler';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Schema ───────────────────────────────────────────────────────────────────
const AnalysisResultSchema = z.object({
  overall_score: z.number().min(0).max(100),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  sections: z.array(z.object({
    name: z.string(),
    score: z.number().min(0).max(100),
    feedback: z.string(),
    issues: z.array(z.string()).default([]),
  })).min(1),
  missing_keywords: z.object({
    technical: z.array(z.string()).default([]),
    soft_skills: z.array(z.string()).default([]),
    industry: z.array(z.string()).default([]),
  }),
  improvements: z.array(z.object({
    section: z.string(),
    original: z.string(),
    rewrite: z.string(),
    reason: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
  })).min(5),
  red_flags: z.array(z.string()).default([]),
  tone_feedback: z.string(),
  ats_tips: z.array(z.string()).min(3).max(5),
  honest_summary: z.string(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ─── Prompts ──────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a brutally honest, senior technical recruiter and ATS specialist with 15+ years of experience screening resumes at top tech companies (Google, Amazon, startups).

Your job is to give REAL, ACTIONABLE feedback — not encouragement.

STRICT RULES:
- Never inflate scores. A mediocre resume scores 40-60. Only exceptional resumes score 80+.
- If the resume is weak, say so clearly. Do not soften real problems.
- Every improvement must reference EXACT text from the resume — never invent content.
- Missing sections, vague bullet points, no metrics, generic skills — all penalize heavily.
- ATS score is purely mechanical: keywords, formatting, parseable structure. Not quality of experience.
- Only give a high score if it genuinely deserves it.
- Return ONLY a valid JSON object. No markdown, no code fences, no explanation.`;

function buildUserPrompt(text: string, yearsOfExperience?: string, targetRole?: string): string {
  let contextInfo = '';
  
  if (yearsOfExperience || targetRole) {
    contextInfo = '\n\nCANDIDATE CONTEXT:';
    if (yearsOfExperience) {
      contextInfo += `\n- Experience Level: ${yearsOfExperience}`;
    }
    if (targetRole) {
      contextInfo += `\n- Target Role: ${targetRole}`;
    }
    contextInfo += '\n\nUse this context to evaluate if the resume matches their experience level and target role. For example:\n- A resume with 5+ years experience should show progression and leadership\n- A resume targeting "Senior Engineer" should demonstrate senior-level impact\n- Check if keywords and content align with the target role requirements\n';
  }

  return `Analyze this resume with full honesty. No sugarcoating.${contextInfo}

SCORING GUIDE (be strict):
- 0-40:  Major problems. Missing sections, no metrics, unparseable, generic.
- 41-60: Below average. Some structure but weak content, vague bullets, keyword gaps.
- 61-75: Average. Decent structure but needs real improvement in 2-3 areas.
- 76-85: Good. Minor issues only. Clear metrics, strong keywords, good structure.
- 86-100: Exceptional. Rare. Only if it reads like a top-tier candidate resume.

WHAT MAKES A GOOD RESUME (evaluate against these):
1. Every bullet starts with a strong action verb (Built, Led, Reduced, Increased)
2. Quantified results — numbers, percentages, scale ("improved load time by 40%", "served 10k users")
3. Relevant technical keywords matching the candidate's field${targetRole ? ` and target role (${targetRole})` : ''}
4. Clean structure parseable by ATS: no tables, no columns, no images
5. No fluff ("hardworking", "team player", "passionate about")
6. Contact info complete: email, phone, LinkedIn, GitHub/portfolio
7. Summary is specific, not generic ("3 years building React apps" not "motivated developer")
8. Projects include tech stack, your role, and measurable outcome
9. No spelling/grammar errors
10. Skills section lists real tools, not adjectives${yearsOfExperience ? `\n11. Content depth matches experience level "${yearsOfExperience}" (e.g., internship/fresher should focus on projects and education, 5+ years should show leadership and impact)` : ''}

Return JSON exactly matching this structure:
{
  "overall_score": <0-100, ATS mechanical compatibility score>,
  "grade": <"A"|"B"|"C"|"D"|"F">,
  "honest_summary": <2-3 sentences. Direct assessment. What's actually wrong or right. No fluff.${targetRole ? ` Comment on fit for ${targetRole}.` : ''}${yearsOfExperience ? ` Comment on whether content matches ${yearsOfExperience} experience level.` : ''}>,
  "sections": [
    {
      "name": <"Contact Info"|"Summary"|"Work Experience"|"Skills"|"Education"|"Projects">,
      "score": <0-100>,
      "feedback": <specific, direct. What's missing or weak. Not generic praise.>,
      "issues": [<exact problems found in this section>]
    }
  ],
  "missing_keywords": {
    "technical": [<tools/technologies missing that are standard for their field${targetRole ? ` and ${targetRole} role` : ''}>],
    "soft_skills": [<only if genuinely absent and relevant>],
    "industry": [<domain-specific terms missing>]
  },
  "improvements": [
    {
      "section": <section name>,
      "original": <EXACT text copied from resume — never paraphrase>,
      "rewrite": <improved version with metrics, action verb, specifics>,
      "reason": <why the original is weak — be specific>,
      "impact": <"high"|"medium"|"low">
    }
    // minimum 5, prioritize high-impact ones first
  ],
  "red_flags": [<serious issues: gaps unexplained, no metrics anywhere, resume too long/short, ATS-breaking formatting, etc.>],
  "tone_feedback": <is the tone professional? too casual? too vague? robotic? specific observation.>,
  "ats_tips": [<3-5 concrete formatting/keyword tips specific to THIS resume, not generic advice>]
}

Resume to analyze:
${text}`;
}

// ─── Analyzer ─────────────────────────────────────────────────────────────────
const TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 3;

export async function analyzeResume(resumeText: string, yearsOfExperience?: string, targetRole?: string): Promise<AnalysisResult> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info('Calling Groq API', { 
        model: GROQ_MODEL, 
        chars: resumeText.length, 
        attempt,
        yearsOfExperience,
        targetRole 
      });

      const completion = await Promise.race([
        groq.chat.completions.create({
          model: GROQ_MODEL,
          temperature: 0.05, // even lower for more consistency
          max_tokens: 4096,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(resumeText, yearsOfExperience, targetRole) },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Groq timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)
        ),
      ]);

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from AI');

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        logger.error('JSON parse failed', { attempt, content: content.substring(0, 200) });
        if (attempt === MAX_ATTEMPTS) {
          throw new AppError(502, 'AI returned invalid JSON. Please try again.');
        }
        continue;
      }

      const validated = AnalysisResultSchema.safeParse(parsed);

      if (!validated.success) {
        logger.warn('Schema mismatch', {
          attempt,
          issues: validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
          sample: JSON.stringify(parsed).substring(0, 300),
        });
        if (attempt === MAX_ATTEMPTS) {
          throw new AppError(502, 'AI returned an unexpected response format. Please try again.');
        }
        continue;
      }

      logger.info('Groq analysis complete', { score: validated.data.overall_score, grade: validated.data.grade });
      return validated.data;

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.error('Groq attempt failed', { attempt, message: lastError.message });
      if (attempt === MAX_ATTEMPTS) break;
    }
  }

  if (lastError instanceof AppError) throw lastError;
  throw new AppError(502, `AI service failed: ${lastError?.message ?? 'Unknown error'}`);
}