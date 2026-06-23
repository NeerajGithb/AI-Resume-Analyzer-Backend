import { z } from 'zod';
import { callGroqJson } from './groqClient';

// ─── Response schema ───────────────────────────────────────────────────────────
const SectionScoreSchema = z.object({
  section: z.string(),
  score: z.number().min(0).max(100),
  status: z.enum(['complete', 'incomplete', 'missing']),
  feedback: z.string(),
});

const LinkedInResultSchema = z.object({
  overall_score: z.number().min(0).max(100),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  completeness: z.number().min(0).max(100),
  section_scores: z.array(SectionScoreSchema).min(4),
  keyword_optimization: z.number().min(0).max(100),
  missing_keywords: z.array(z.string()),
  strengths: z.array(z.string()).min(2),
  improvements: z.array(z.object({
    priority: z.enum(['high', 'medium', 'low']),
    section: z.string(),
    recommendation: z.string(),
  })).min(5),
  headline_suggestion: z.string(),
  summary_feedback: z.string(),
});

export type LinkedInResult = z.infer<typeof LinkedInResultSchema>;

// ─── Prompts ──────────────────────────────────────────────────────────────────
const SYSTEM = 'You are a LinkedIn profile optimization expert. Analyze profiles for completeness, keyword optimization, and professional presentation. Return ONLY valid JSON. No markdown, no code fences.';

function buildPrompt(profileText: string): string {
  return `Analyze this LinkedIn profile and return JSON with:
- overall_score: number 0-100 (overall profile quality)
- grade: "A"|"B"|"C"|"D"|"F"
- completeness: number 0-100 (how complete the profile is)
- section_scores: [{section, score:0-100, status:"complete"|"incomplete"|"missing", feedback}] — analyze: "Headline", "Summary", "Experience", "Skills", "Education", "Certifications"
- keyword_optimization: number 0-100 (industry keyword density)
- missing_keywords: string[] (important keywords missing from profile)
- strengths: string[] (3-4 things done well)
- improvements: [{priority:"high"|"medium"|"low", section, recommendation}] — at least 8 specific improvements
- headline_suggestion: string (optimized headline if current one needs improvement)
- summary_feedback: string (2-3 sentences on summary quality)

LINKEDIN PROFILE TEXT:
${profileText.slice(0, 8000)}

EVALUATION CRITERIA:
- Headline: Keywords, role clarity, value proposition
- Summary: Story, achievements, call-to-action
- Experience: Quantified achievements, action verbs, consistency
- Skills: Relevance, endorsements, keyword optimization
- Education & Certifications: Completeness
- Overall: Professional photo, custom URL, recommendations, engagement`;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function analyzeLinkedInProfile(profileText: string): Promise<LinkedInResult> {
  return callGroqJson(
    LinkedInResultSchema,
    SYSTEM,
    buildPrompt(profileText),
    { temperature: 0.2, maxTokens: 2560 },
  );
}
