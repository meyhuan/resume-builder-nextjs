/**
 * Prompt engineering for AI resume import/parsing.
 *
 * Builds structured prompts that instruct the AI to parse raw resume text
 * (plain text, Markdown, or JSON) into the ExternalResume JSON schema.
 */

/**
 * Build the system prompt for resume import parsing.
 */
export function buildImportSystemPrompt(): string {
  return `You are a professional resume parsing expert with 10 years of HR and resume analysis experience.
Your task is to parse the user's raw resume text (which may be plain text, Markdown, or AI-generated content) and structure it into a standard JSON format.

Core rules:
1. Your output MUST be a valid JSON string that can be directly parsed by JSON.parse
2. Do NOT include any extra content (explanations, comments, markdown markers, code block markers, etc.)
3. If the input is clearly not a resume (e.g. fiction, news, code, chat logs), return: {"error": "NOT_RESUME", "message": "The input does not appear to be a resume. Please paste your resume content and try again."}
4. Extract all valuable information from the raw text to the best of your ability
5. Important content that cannot be classified into standard modules should go into the custom_module_info array`;
}

/**
 * Build the user prompt for resume import parsing.
 */
export function buildImportUserPrompt(rawText: string): string {
  const sections: string[] = [];

  sections.push(buildParsingInstructions());
  sections.push(buildOutputSchema());
  sections.push(buildCustomModuleInstructions());
  sections.push(buildFinalInstructions());
  sections.push(buildRawTextSection(rawText));

  return sections.join('\n\n');
}

function buildParsingInstructions(): string {
  return `## Parsing Requirements

Extract information from the following raw resume text and output it in the specified JSON structure.

Parsing strategy:
1. Intelligently identify resume sections (basic info, education, work experience, projects, etc.)
2. Even if formatting is messy or section headers differ, do your best to map content to the correct modules
3. HTML content fields should use <ul><li> for bullet points, or <p> tags for paragraphs
4. Normalize date formats to "MM/YYYY" where possible (e.g. "June 2023" becomes "06/2023")
5. If a field's information is missing, omit the field entirely — do not fill with placeholders
6. Preserve all substantive content from the original text — do not discard any valuable information`;
}

function buildOutputSchema(): string {
  return `## Output JSON Schema

Generate JSON strictly following this TypeScript interface:

\`\`\`
interface ExternalResume {
  base_info: {
    name: string;
    gender?: string;
    age?: string;
    phone?: string;
    mail?: string;
    hide_avatar?: boolean;
  };
  self_evaluation?: {
    content: string;       // HTML format
    is_hide?: boolean;
  };
  experience?: Array<{
    id: string;
    name: string;          // Company name
    industry?: string;
    position: string;      // Job title
    content: string;       // HTML format, use <ul><li> for bullets
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  intern?: Array<{
    id: string;
    name: string;
    industry?: string;
    position: string;
    content: string;
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  education?: Array<{
    id: string;
    name: string;          // School name
    major?: string;
    degree?: string;
    course?: string;       // HTML format
    is_hide?: boolean;
    period: { start: string; end: string; };
    content?: string;
  }>;
  program_experience?: Array<{
    id: string;
    name: string;          // Project name
    role?: string;
    content: string;       // HTML format
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  school_exps?: Array<{
    id: string;
    name: string;
    position?: string;
    content: string;
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  skills?: {
    content: string;       // HTML format
    is_hide?: boolean;
  };
  qualifications?: {
    content: string;       // HTML format
    is_hide?: boolean;
  };
  custom_module_info?: Array<{
    name: string;          // Custom module title
    content: string;       // HTML format content
    module_name: string;   // Same as name
    is_hide?: boolean;
  }>;
}
\`\`\`

Each entry's id must be unique, using formats like "exp-1", "edu-1", "proj-1", "intern-1", "campus-1".`;
}

function buildCustomModuleInstructions(): string {
  return `## Custom Module Handling

If the following types of content appear in the resume but cannot be classified into the standard modules above, place them in the custom_module_info array:
- Awards and honors
- Volunteer experience and community service
- Portfolio and open-source contributions
- Language proficiency (non-technical)
- Hobbies and interests
- Published papers and patents
- Any other valuable content that doesn't fit standard modules

Set each custom module's name and module_name to the category name (e.g. "Awards", "Volunteer Experience", etc.).`;
}

function buildFinalInstructions(): string {
  return `## Final Requirements
1. You MUST return a valid JSON string that can be directly parsed by JSON.parse
2. Do NOT include any text, explanations, or markdown code block markers outside the JSON
3. Omit unnecessary modules entirely — do not set them to empty arrays
4. All HTML content fields must contain substantive content
5. Verify JSON format validity before returning
6. If the input is not resume content, return error JSON: {"error": "NOT_RESUME", "message": "..."}`;
}

function buildRawTextSection(rawText: string): string {
  return `## Raw Resume Text to Parse

---
${rawText}
---`;
}
