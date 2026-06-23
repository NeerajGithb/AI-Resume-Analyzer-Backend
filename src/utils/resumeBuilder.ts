import { z } from 'zod';
import Groq from 'groq-sdk';
import { env } from '../config/env';
import { logger } from './logger';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

// ─── Input schema ─────────────────────────────────────────────────────────────
export const BuilderInputSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().email(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  leetcode: z.string().optional(),
  degree: z.string(),
  institution: z.string(),
  location: z.string().optional(),
  graduationYear: z.string().optional(),
  targetRole: z.string(),
  projectsExperience: z.string().optional(),
  skills: z.string(),
});

export type BuilderInput = z.infer<typeof BuilderInputSchema>;

// ─── Response schema ──────────────────────────────────────────────────────────
const BuilderResultSchema = z.object({
  summary: z.string(),
  projects: z.array(z.object({
    name: z.string(),
    year: z.string(),
    technologies: z.string(),
    url: z.string().optional(),
    bullets: z.array(z.string()).min(2),
  })).min(2),
  achievements: z.array(z.string()).min(2),
});

export type BuilderResult = z.infer<typeof BuilderResultSchema>;

// ─── Prompts ──────────────────────────────────────────────────────────────────
const SYSTEM = `You are a professional resume writer. Generate REALISTIC resume content based on user's actual information.

CRITICAL RULES - NO FAKE CONTENT:
- Use ONLY information provided by the user
- If user mentioned projects, base content on those REAL projects
- If no projects mentioned, create simple, believable project examples
- NO exaggerated claims like "increased performance by 500%"
- NO fake metrics or numbers
- NO overconfident language like "expert", "master", "proficient"
- Use modest, factual language: "Built", "Developed", "Implemented", "Created"
- Keep it honest and realistic for their experience level
- Return ONLY valid JSON`;

function buildPrompt(input: BuilderInput): string {
  const projectsContext = input.projectsExperience 
    ? `\n\nREAL PROJECTS USER MENTIONED:\n${input.projectsExperience}\n\nUse these as basis for project section. Keep descriptions factual.`
    : '\n\nUser has not mentioned specific projects. Create 2 simple, realistic project examples using their skills.';

  return `Generate professional resume content for this person:

Name: ${input.name}
Target Role: ${input.targetRole}
Education: ${input.degree} from ${input.institution}
Skills: ${input.skills}${projectsContext}

Generate CONCISE, REALISTIC content that fits on ONE page:
1. Professional summary (2 sentences max, 25-30 words) - Focus on their skills and education, NO exaggeration
2. 2 projects with 3-4 bullet points each - Base on their real projects if provided, otherwise create simple examples
3. 2 achievements - Keep realistic and modest

RETURN THIS EXACT JSON FORMAT:
{
  "summary": "<Factual 2 sentence summary as ${input.targetRole}, no exaggeration>",
  "projects": [
    {
      "name": "<realistic project name>",
      "year": "2024",
      "technologies": "<3-5 tech from their actual skills>",
      "url": "https://example.com",
      "bullets": [
        "<15-20 words, factual, no fake metrics>",
        "<15-20 words, focus on what was built>",
        "<15-20 words, technical details only>"
      ]
    }
  ],
  "achievements": [
    "<Simple, believable achievement 10-15 words>",
    "<Another modest achievement 10-15 words>"
  ]
}

CRITICAL: Be HONEST. NO fake numbers. NO overconfidence. Use their actual skills and real project info if provided.`;
}

// ─── Export ───────────────────────────────────────────────────────────────────
export async function buildResume(input: BuilderInput): Promise<BuilderResult> {
  const MAX_RETRIES = 3;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info('Calling Groq API for resume generation', {
        model: 'llama-3.3-70b-versatile',
        attempt,
      });

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildPrompt(input) },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content?.trim();

      if (!content) {
        throw new Error('Empty response from AI');
      }

      // Parse and validate JSON
      const parsed = JSON.parse(content);
      const validated = BuilderResultSchema.parse(parsed);

      logger.info('Resume content generated successfully', { attempt });
      return validated;
    } catch (error: any) {
      logger.warn('Resume generation attempt failed', { attempt, error: error.message });
      
      if (attempt === MAX_RETRIES) {
        logger.error('Resume generation failed after all retries');
        throw new Error('Failed to generate resume content. Please try again.');
      }
    }
  }

  throw new Error('Failed to generate resume content');
}