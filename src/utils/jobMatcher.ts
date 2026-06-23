import { z } from 'zod';
import { callGroqJson } from './groqClient';

// ─── Schema ───────────────────────────────────────────────────────────────────
const RecommendationSchema = z.object({
  priority: z.enum(['high', 'medium', 'low']),
  action:   z.string(),
  reason:   z.string(),
});

const JobMatchResultSchema = z.object({
  match_score:               z.number().min(0).max(100),
  match_grade:               z.enum(['A', 'B', 'C', 'D', 'F']),
  overall_verdict:           z.string(),
  should_apply:              z.boolean().optional(),
  should_apply_reason:       z.string().optional(),
  matched_keywords:          z.array(z.string()),
  missing_keywords:          z.array(z.string()),
  matched_requirements:      z.array(z.string()),
  missing_requirements:      z.array(z.string()),
  experience_gap:            z.string().nullable().optional(),
  recommendations:           z.array(RecommendationSchema).min(3),
});

export type JobMatchResult = z.infer<typeof JobMatchResultSchema>;

// ─── Prompts ──────────────────────────────────────────────────────────────────
const SYSTEM = `You are a senior technical recruiter who has screened 50,000+ resumes. You give honest, direct assessments.

STRICT RULES:
- Never inflate match_score. A resume missing core requirements scores 30-50, not 70.
- match_score is purely keyword + requirement overlap — not potential or personality.
- should_apply is a hard boolean. If match_score < 50 or critical requirements are missing, it's false.
- experience_gap must call out years-of-experience mismatches explicitly (e.g. "JD requires 5 years, resume shows 1").
- honest_verdict is 2-3 sentences. Direct. No softening language.
- Every recommendation must be specific to THIS resume vs THIS JD — never generic.
- Return ONLY valid JSON. No markdown, no code fences.`;

function buildPrompt(resumeText: string, jobDescriptionText: string): string {
  return `Compare this resume to the job description. Be brutally honest about fit.

SCORING GUIDE (strict):
- 80-100: Resume matches 80%+ of requirements. Strong candidate.
- 60-79:  Matches core requirements, missing some nice-to-haves. Viable candidate.
- 40-59:  Significant gaps. Missing key requirements. Weak match.
- 0-39:   Poor fit. Missing critical skills or experience level.

RETURN THIS JSON EXACTLY:
{
  "match_score": <0-100, based strictly on keyword + requirement overlap>,
  "match_grade": <"A"|"B"|"C"|"D"|"F">,
  "overall_verdict": "<2-3 sentences. Direct assessment of fit. Call out the biggest gap.>",
  "should_apply": <true only if match_score >= 50 AND no hard blockers like missing required degree/years>,
  "should_apply_reason": "<one sentence explaining the yes/no decision>",
  "matched_keywords": ["<keyword from JD found in resume>", ...],
  "missing_keywords": ["<important JD keyword absent from resume>", ...],
  "matched_requirements": ["<specific JD requirement the resume satisfies>", ...],
  "missing_requirements": ["<specific JD requirement the resume does NOT meet>", ...],
  "experience_gap": "<e.g. 'JD requires 3+ years, resume shows ~1 year' or null if no gap>",
  "recommendations": [
    {
      "priority": "high"|"medium"|"low",
      "action": "<specific action: add X skill, rewrite Y bullet, get Z certification>",
      "reason": "<why this matters for THIS specific job>"
    }
    // minimum 5, sorted high → low priority
  ]
}

RESUME:
${resumeText.slice(0, 6000)}

JOB DESCRIPTION:
${jobDescriptionText.slice(0, 3000)}`;
}

// ─── Export ───────────────────────────────────────────────────────────────────
export async function matchResumeToJob(
  resumeText: string,
  jobDescriptionText: string,
): Promise<JobMatchResult> {
  return callGroqJson(
    JobMatchResultSchema,
    SYSTEM,
    buildPrompt(resumeText, jobDescriptionText),
    { temperature: 0.05, maxTokens: 2048, maxAttempts: 3 },
  );
}