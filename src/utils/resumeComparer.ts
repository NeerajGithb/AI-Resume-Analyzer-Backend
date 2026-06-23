import { z } from 'zod';
import { callGroqJson } from './groqClient';

// ─── Schema ───────────────────────────────────────────────────────────────────
const CriterionSchema = z.object({
  name:          z.string(),
  resume1_score: z.number().min(0).max(100),
  resume2_score: z.number().min(0).max(100),
  winner:        z.union([z.literal(1), z.literal(2), z.literal(0)]),
  notes:         z.string(),
});

const ComparisonResultSchema = z.object({
  resume1_score:      z.number().min(0).max(100),
  resume2_score:      z.number().min(0).max(100),
  resume1_grade:      z.enum(['A', 'B', 'C', 'D', 'F']),
  resume2_grade:      z.enum(['A', 'B', 'C', 'D', 'F']),
  winner:             z.union([z.literal(1), z.literal(2), z.literal(0)]),
  score_difference:   z.number().optional(),
  verdict:            z.string(),
  criteria:           z.array(CriterionSchema).min(5),
  resume1_strengths:  z.array(z.string()).min(2),
  resume2_strengths:  z.array(z.string()).min(2),
  resume1_weaknesses: z.array(z.string()).min(2),
  resume2_weaknesses: z.array(z.string()).min(2),
  recommendation:     z.string().optional(),
});

export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;

// ─── Prompts ──────────────────────────────────────────────────────────────────
const SYSTEM = `You are a senior technical recruiter who screens 200+ resumes per week. You compare resumes with brutal honesty.

STRICT RULES:
- Score each resume independently first, then compare. Don't adjust one score to make the comparison look closer.
- If both resumes are weak, both get low scores. Don't inflate either to look like a winner.
- winner: 0 (tie) only if scores are within 3 points AND genuinely comparable quality.
- Strengths and weaknesses must reference SPECIFIC content from each resume — never generic observations.
- honest_verdict calls out the real difference plainly. No diplomatic softening.
- score_difference is Math.abs(resume1_score - resume2_score). Makes the gap obvious.
- Return ONLY valid JSON. No markdown, no code fences.`;

function buildPrompt(text1: string, text2: string): string {
  return `Compare these two resumes. Score them independently, then compare honestly.

SCORING GUIDE (apply to both equally):
- 0-40:  Major problems. No metrics, missing sections, ATS-breaking format.
- 41-60: Below average. Some structure but vague bullets, keyword gaps.
- 61-75: Average. Works but needs real improvement.
- 76-85: Good. Clear metrics, strong keywords, solid structure.
- 86-100: Exceptional. Rare. Only if genuinely outstanding.

EVALUATE THESE CRITERIA (score each 0-100 per resume):
1. ATS Keywords       — relevant technical/industry terms present
2. Quantified Results — bullets with numbers, percentages, scale
3. Formatting         — clean, parseable, no tables/columns/images
4. Experience Depth   — specificity of roles, projects, responsibilities
5. Skills Section     — concrete tools listed, not adjectives
6. Summary/Objective  — specific and relevant vs generic filler

RETURN THIS JSON EXACTLY:
{
  "resume1_score": <0-100>,
  "resume2_score": <0-100>,
  "resume1_grade": <"A"|"B"|"C"|"D"|"F">,
  "resume2_grade": <"A"|"B"|"C"|"D"|"F">,
  "winner": <1|2|0>,
  "score_difference": <Math.abs(resume1_score - resume2_score)>,
  "verdict": "<2-3 sentences. State which is better and exactly why. Call out the deciding factor.>",
  "criteria": [
    {
      "name": "<criterion name>",
      "resume1_score": <0-100>,
      "resume2_score": <0-100>,
      "winner": <1|2|0>,
      "notes": "<specific observation referencing actual content from both resumes>"
    }
  ],
  "resume1_strengths": ["<specific strength with evidence from resume>", ...],
  "resume2_strengths": ["<specific strength with evidence from resume>", ...],
  "resume1_weaknesses": ["<specific weakness — not generic>", ...],
  "resume2_weaknesses": ["<specific weakness — not generic>", ...],
  "recommendation": "<concrete advice: which to use for what role/context, and top 1 fix for the losing resume>"
}

RESUME 1:
${text1.slice(0, 5000)}

RESUME 2:
${text2.slice(0, 5000)}`;
}

// ─── Export ───────────────────────────────────────────────────────────────────
export async function compareResumes(
  text1: string,
  text2: string,
): Promise<ComparisonResult> {
  return callGroqJson(
    ComparisonResultSchema,
    SYSTEM,
    buildPrompt(text1, text2),
    { temperature: 0.05, maxTokens: 3000, maxAttempts: 3 },
  );
}