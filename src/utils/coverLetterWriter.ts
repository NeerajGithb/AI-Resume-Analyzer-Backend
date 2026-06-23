import { z } from 'zod';
import { callGroqJson } from './groqClient';

// ─── Schema ───────────────────────────────────────────────────────────────────
const CoverLetterResultSchema = z.object({
  cover_letter: z.string().min(200),
  word_count: z.number(),
  tone: z.enum(['professional', 'enthusiastic', 'formal', 'conversational']),
  key_highlights: z.array(z.string()).min(3).max(4),
  match_score: z.number().min(0).max(100),
  missing_from_resume: z.array(z.string()).default([]),
  tips: z.array(z.string()).min(3).max(5),
});

export type CoverLetterResult = z.infer<typeof CoverLetterResultSchema>;

// ─── Prompts ──────────────────────────────────────────────────────────────────
const SYSTEM = `You are a senior hiring manager and cover letter specialist who has reviewed 10,000+ applications.

STRICT RULES:
- Never fabricate achievements, titles, or experiences not present in the resume.
- Never use these phrases: "I am writing to apply", "passionate", "hardworking", "team player", "dynamic", "leverage", "synergy".
- If the resume doesn't match the JD well, say so honestly in tips — don't fake a high match_score.
- key_highlights must reference EXACT experiences from the resume, not invented ones.
- missing_from_resume lists skills/experiences the JD requires that the resume lacks.
- Return ONLY valid JSON. No markdown, no explanation.`;

function buildPrompt(
  resumeText: string,
  jobDescriptionText: string,
  companyName: string,
  tone: string,
): string {
  return `Write a cover letter for this candidate. Be honest about fit. Do not invent anything.

WHAT MAKES A GREAT COVER LETTER:
1. Opens with a specific, confident statement — not "I am writing to apply"
2. 2-3 bullet points or short paragraphs tying exact resume achievements to JD requirements
3. One sentence showing genuine knowledge of the company (infer from JD)
4. Closes with a direct, confident call to action
5. 250-350 words — not a single word more
6. Tone is ${tone} — if formal, no contractions; if conversational, write like a smart human

RETURN THIS JSON EXACTLY:
{
  "cover_letter": "<full cover letter text, 250-350 words>",
  "word_count": <actual count>,
  "tone": "${tone}",
  "key_highlights": [
    "<exact achievement from resume mapped to a JD requirement>",
    "<another exact match>",
    "<another exact match>"
  ],
  "match_score": <0-100. Honest score. Low if resume skills don't match JD. Not inflated.>,
  "missing_from_resume": [
    "<skill or experience the JD requires that is absent from the resume>"
  ],
  "tips": [
    "<specific improvement tip for THIS cover letter — not generic advice>",
    "<another specific tip>",
    "<another specific tip>"
  ]
}

RESUME:
${resumeText.slice(0, 5000)}

JOB DESCRIPTION:
${jobDescriptionText.slice(0, 3000)}

COMPANY: ${companyName || 'the company'}
TONE: ${tone}`;
}

// ─── Export ───────────────────────────────────────────────────────────────────
export async function generateCoverLetter(
  resumeText: string,
  jobDescriptionText: string,
  companyName: string,
  tone: string = 'professional',
): Promise<CoverLetterResult> {
  return callGroqJson(
    CoverLetterResultSchema,
    SYSTEM,
    buildPrompt(resumeText, jobDescriptionText, companyName, tone),
    { temperature: 0.3, maxTokens: 2048 },
  );
}