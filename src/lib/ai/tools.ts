import { generateText, tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { getJsonProviderOptions, getModel, type AIConfig } from '@/lib/ai/provider';
import { analyzeJdMatch } from '@/lib/ai/analyze-jd-match';
import { extractJson } from '@/lib/ai/extract-json';
import { sanitizeResumeHtml } from '@/lib/ai/html-sanitize';
import type { ResumeData } from '@/entities/resume/resume-data';

export type ChatChangeProposal =
  | {
      action: 'updateBlock';
      blockId: string;
      html: string;
      reason?: string;
    }
  | {
      action: 'addSection';
      type: string;
      title: string;
      contentHtml?: string;
    }
  | {
      action: 'suggestSkills';
      skills: string[];
      category: string;
    };

function findBlock(resumeData: ResumeData, blockId: string) {
  for (const section of resumeData.sections) {
    const block = section.blocks.find((item) => item.id === blockId);
    if (block) return { section, block };
  }
  return null;
}

function findSkillsSection(resumeData: ResumeData) {
  return resumeData.sections.find((section) =>
    /技能|skill/i.test(section.title),
  );
}

export function createChatTools(params: {
  resumeData: ResumeData;
  aiConfig: AIConfig;
}): ToolSet {
  const { resumeData, aiConfig } = params;

  return {
    updateBlockContent: tool({
      description: `Update the HTML content of a specific resume block. Block content structures:
- experience/project/campus: HTML in contentHtml (use <p>/<ul>/<li>/<strong>)
- education: HTML in courseHtml
- text: HTML in html
- list: HTML items
Do NOT change company, position, dates, or other metadata fields.
Use the exact blockId from the resume data.`,
      inputSchema: z.object({
        blockId: z.string().describe('The ID of the block to update'),
        html: z.string().describe('The new HTML value for the block content'),
        reason: z.string().optional().describe('Why this change is being made'),
      }),
      execute: async ({ blockId, html, reason }): Promise<ChatChangeProposal | { success: false; error: string }> => {
        if (!findBlock(resumeData, blockId)) {
          return { success: false, error: `Block not found: ${blockId}` };
        }
        const sanitized = sanitizeResumeHtml(html);
        if (!sanitized.replace(/<[^>]*>/g, '').trim()) {
          return { success: false, error: 'Invalid value: html cannot be empty' };
        }
        return { action: 'updateBlock', blockId, html: sanitized, reason };
      },
    }),

    addSection: tool({
      description: 'Add a new section to the resume. Use this when the user wants to add a new section type.',
      inputSchema: z.object({
        type: z.string().describe('The type of section to add (e.g., "work_experience", "education", "skills", "projects", "certifications", "languages", "custom")'),
        title: z.string().describe('The display title for the section'),
        content: z.string().optional().describe('Initial HTML content for the new section.'),
      }),
      execute: async ({ type, title, content }): Promise<ChatChangeProposal> => {
        return {
          action: 'addSection',
          type,
          title,
          contentHtml: content ? sanitizeResumeHtml(content) : undefined,
        };
      },
    }),

    rewriteText: tool({
      description: 'Rewrite a text field to improve its impact, clarity, and professionalism. Use this when the user asks to improve or rewrite text.',
      inputSchema: z.object({
        blockId: z.string().describe('The block containing the text'),
        improvedText: z.string().describe('The improved HTML to replace the original'),
      }),
      execute: async ({ blockId, improvedText }): Promise<ChatChangeProposal | { success: false; error: string }> => {
        if (!findBlock(resumeData, blockId)) {
          return { success: false, error: `Block not found: ${blockId}` };
        }
        const sanitized = sanitizeResumeHtml(improvedText);
        if (!sanitized.replace(/<[^>]*>/g, '').trim()) {
          return { success: false, error: 'Invalid value: improvedText cannot be empty' };
        }
        return { action: 'updateBlock', blockId, html: sanitized };
      },
    }),

    suggestSkills: tool({
      description: 'Suggest relevant skills based on work experience and add them to the skills section.',
      inputSchema: z.object({
        skills: z.array(z.string()).describe('List of suggested skills'),
        category: z.string().describe('The skill category name'),
      }),
      execute: async ({ skills, category }): Promise<ChatChangeProposal | { success: false; error: string }> => {
        if (!findSkillsSection(resumeData)) {
          return { success: false, error: 'Skills section not found' };
        }
        return { action: 'suggestSkills', skills, category };
      },
    }),

    analyzeJdMatch: tool({
      description: 'Analyze how well the current resume matches a job description. Use this when the user pastes a JD or asks about job fit.',
      inputSchema: z.object({
        jobDescription: z.string().describe('The job description text to analyze against the resume'),
      }),
      execute: async ({ jobDescription }) => {
        const analysis = await analyzeJdMatch({
          resumeData,
          jobDescription,
          aiConfig,
        });
        return { success: true, analysis };
      },
    }),

    translateResume: tool({
      description: 'Translate the resume to a different language. Use this when the user asks to translate their resume to Chinese or English.',
      inputSchema: z.object({
        targetLanguage: z.enum(['zh', 'en']).describe('Target language: "zh" for Chinese, "en" for English'),
      }),
      execute: async ({ targetLanguage }) => {
        const model = getModel(aiConfig);
        const langName = targetLanguage === 'zh' ? 'Simplified Chinese' : 'English';
        const singleBlockSchema = z.object({
          blockId: z.string(),
          html: z.string(),
        });

        const blocks = resumeData.sections.flatMap((section) =>
          section.blocks.map((block) => {
            const html =
              'contentHtml' in block
                ? block.contentHtml
                : 'html' in block
                  ? block.html
                  : block.type === 'education'
                    ? block.courseHtml || ''
                    : block.type === 'list'
                      ? block.items.map((item) => item.html).join('')
                      : '';
            return { blockId: block.id, type: block.type, html };
          }),
        );

        const CONCURRENCY = 4;
        const results: Array<{ ok: true; data: z.infer<typeof singleBlockSchema> } | { ok: false }> =
          new Array(blocks.length);
        let nextIdx = 0;

        const translateOne = async (block: (typeof blocks)[number]) => {
          const result = await generateText({
            model,
            maxOutputTokens: 4096,
            system: `You are a professional resume translator. Translate the given resume section into ${langName}.
Rules:
- Use professional, formal ${langName} appropriate for resumes
- Technical terms and programming languages stay in English
- Preserve the exact HTML structure and all field names — only translate string values
- Keep all IDs, URLs, emails, phone numbers unchanged
- CRITICAL: Return a single valid JSON object with keys: blockId, html. No markdown, no code fences.`,
            prompt: `Translate this resume block. Return JSON with keys: blockId, html.\n\n${JSON.stringify(block)}`,
            providerOptions: getJsonProviderOptions(aiConfig),
          });
          return extractJson(result.text, singleBlockSchema);
        };

        async function worker() {
          while (nextIdx < blocks.length) {
            const i = nextIdx++;
            try {
              const data = await translateOne(blocks[i]);
              results[i] = { ok: true, data: { ...data, html: sanitizeResumeHtml(data.html) } };
            } catch {
              results[i] = { ok: false };
            }
          }
        }

        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, blocks.length) }, () => worker()));

        const proposals: ChatChangeProposal[] = [];
        let failed = 0;
        for (const result of results) {
          if (!result.ok) {
            failed += 1;
            continue;
          }
          if (result.data.html.replace(/<[^>]*>/g, '').trim()) {
            proposals.push({
              action: 'updateBlock',
              blockId: result.data.blockId,
              html: result.data.html,
            });
          }
        }

        return {
          success: true,
          language: targetLanguage,
          translatedBlocks: proposals.length,
          failedBlocks: failed,
          proposals,
        };
      },
    }),
  };
}
