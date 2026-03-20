/**
 * Prompt engineering for AI resume generation.
 *
 * Builds structured prompts from wizard inputs that instruct the AI
 * to return valid JSON matching the ExternalResume schema.
 */

export type UserIdentity = 'student' | 'graduate' | 'professional';

/**
 * Clean input extracted from the wizard store for prompt building.
 */
export interface WizardInput {
  readonly identity: UserIdentity;
  readonly workYears: string;
  readonly targetRole: string;
  readonly major: string;
  readonly projects: readonly string[];
  readonly campusActivities: readonly string[];
  readonly softSkills: readonly string[];
  readonly certificates: readonly string[];
  readonly additionalInfo: string;
}

/** Identity labels used inside prompts. */
const IDENTITY_LABELS: Record<UserIdentity, string> = {
  student: 'Current Student',
  graduate: 'Recent Graduate',
  professional: 'Working Professional',
};

/**
 * Build the complete system prompt for resume generation.
 */
export function buildSystemPrompt(): string {
  return `You are a professional resume writer with 10 years of experience. You specialize in crafting high-quality, professional English resume content based on the user's background, target role, and personal experience.
Your output MUST be a valid JSON string that can be directly parsed by JSON.parse. Do NOT include any extra content such as explanations, comments, markdown markers, or code block markers.`;
}

/**
 * Build the user prompt for full resume generation.
 */
export function buildResumePrompt(input: WizardInput): string {
  const identityLabel: string = IDENTITY_LABELS[input.identity];
  const sections: string[] = [];

  sections.push(buildUserContext(input, identityLabel));
  sections.push(buildSectionInstructions(input));
  sections.push(buildContentGuidelines(input, identityLabel));
  sections.push(buildOutputSchema());
  sections.push(buildFinalInstructions());

  return sections.join('\n\n');
}

/**
 * Build a prompt for generating a single module's content (future use).
 */
export function buildModulePrompt(
  moduleTitle: string,
  keywords: string,
  context: string,
): string {
  return `Context: Generate content based on the following keywords "${keywords}".${context ? ` Additional info: ${context}` : ''}
Goal: Generate polished resume content for the "${moduleTitle}" section using the provided keywords. Use industry-standard resume terminology. Ensure the content is concise, professional, and highlights core competencies, work experience, or achievements related to "${moduleTitle}".
Style: Rigorous and concise resume writing style. Avoid casual language, use precise wording, and ensure the content is highly professional and follows resume industry standards.
Response: Return the final content directly in pure HTML format (using <ul><li> or <p> tags). Do not include any explanations or unnecessary information.`;
}

/**
 * Build a prompt for polishing existing content (future use).
 */
export function buildPolishPrompt(
  moduleTitle: string,
  content: string,
): string {
  return `You are a professional resume optimization consultant. Please polish and improve the "${moduleTitle}" section of this resume.
Requirements:
1. Only refine the existing content — do not add unrelated information
2. Maintain a professional, rigorous tone using industry-standard resume language
3. Keep it concise, preserve core value, and highlight professional strengths
4. Return the polished content directly in pure HTML format (using <ul><li> or <p> tags) — do not include any explanations

Original content: ${content}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildUserContext(input: WizardInput, identityLabel: string): string {
  const lines: string[] = [
    `## User Information`,
    `- Identity: ${identityLabel}`,
    `- Target Role: ${input.targetRole}`,
  ];
  if (input.major) {
    lines.push(`- Major/Field: ${input.major}`);
  }
  if (input.identity === 'professional' && input.workYears) {
    lines.push(`- Years of Experience: ${input.workYears}`);
  }
  if (input.projects.length > 0) {
    lines.push(`- Project Keywords: ${input.projects.join(', ')}`);
  }
  if (input.campusActivities.length > 0) {
    lines.push(`- Campus Activities: ${input.campusActivities.join(', ')}`);
  }
  if (input.softSkills.length > 0) {
    lines.push(`- Skills: ${input.softSkills.join(', ')}`);
  }
  if (input.certificates.length > 0) {
    lines.push(`- Certifications: ${input.certificates.join(', ')}`);
  }
  if (input.additionalInfo) {
    lines.push(`- Additional Info: ${input.additionalInfo}`);
  }
  return lines.join('\n');
}

function buildSectionInstructions(input: WizardInput): string {
  const lines: string[] = ['## Resume Sections to Generate'];
  switch (input.identity) {
    case 'student':
      lines.push('Generate the following sections (ordered by importance):');
      lines.push('1. base_info — Basic info (use "Your Name" as placeholder, phone and email as placeholders)');
      lines.push('2. self_evaluation — Professional summary');
      lines.push('3. education — Education (1 entry, generate a reasonable school and courses based on major)');
      if (input.campusActivities.length > 0) {
        lines.push('4. school_exps — Campus experience (generate 1-2 entries based on user\'s campus activity keywords)');
      }
      lines.push(`${input.campusActivities.length > 0 ? '5' : '4'}. skills — Skills`);
      if (input.certificates.length > 0) {
        lines.push(`${input.campusActivities.length > 0 ? '6' : '5'}. qualifications — Certifications`);
      }
      lines.push('Note: Students typically have no formal work experience. Do not generate the experience field. You may generate intern (internship) entries if appropriate.');
      break;
    case 'graduate':
      lines.push('Generate the following sections (ordered by importance):');
      lines.push('1. base_info — Basic info');
      lines.push('2. self_evaluation — Professional summary');
      lines.push('3. education — Education (1 entry)');
      if (input.projects.length > 0) {
        lines.push('4. program_experience — Project experience (generate 1-2 entries based on user\'s project keywords)');
      }
      lines.push(`${input.projects.length > 0 ? '5' : '4'}. intern — Internship experience (generate 1 entry related to target role)`);
      lines.push(`${input.projects.length > 0 ? '6' : '5'}. skills — Skills`);
      if (input.certificates.length > 0) {
        lines.push(`${input.projects.length > 0 ? '7' : '6'}. qualifications — Certifications`);
      }
      break;
    case 'professional': {
      const years: number = parseWorkYears(input.workYears);
      lines.push('Generate the following sections (ordered by importance):');
      lines.push('1. base_info — Basic info');
      lines.push('2. self_evaluation — Professional summary');
      lines.push(`3. experience — Work experience (generate ${years <= 3 ? '1-2' : '2-3'} entries, most recent first)`);
      if (input.projects.length > 0) {
        lines.push('4. program_experience — Project experience (generate 1-2 entries based on user\'s project keywords)');
      }
      lines.push(`${input.projects.length > 0 ? '5' : '4'}. education — Education (1 entry)`);
      lines.push(`${input.projects.length > 0 ? '6' : '5'}. skills — Skills`);
      if (input.certificates.length > 0) {
        lines.push(`${input.projects.length > 0 ? '7' : '6'}. qualifications — Certifications`);
      }
      break;
    }
  }
  return lines.join('\n');
}

function buildContentGuidelines(input: WizardInput, identityLabel: string): string {
  const years: number = parseWorkYears(input.workYears);
  const lines: string[] = ['## Content Generation Requirements'];

  lines.push(`1. All content MUST be strictly tailored to the [${input.targetRole}] role — no irrelevant content`);
  lines.push('2. Content must be professional, clear, and detailed — expand appropriately to enrich the resume');
  lines.push('3. Use quantified data (percentages, numbers, timeframes) to demonstrate impact wherever possible');
  lines.push('4. Use professional terminology that follows resume industry standards and ATS-friendly keywords');
  lines.push('5. Prefer concise, achievement-oriented bullet points following Action + Scope + Result logic');
  lines.push('6. HTML content should use <ul><li> format for bullet points, or <p> tags for paragraphs');
  lines.push('7. Date format should be "MM/YYYY", e.g. "06/2023"');

  if (input.identity === 'professional') {
    lines.push(`8. [Experience-level adaptation] Adjust content depth for ${years} years of experience:`);
    lines.push(`   ${generateYearsGuidance(years)}`);
  } else if (input.identity === 'student') {
    lines.push(`8. As a ${identityLabel}, emphasize learning ability, coursework, campus activities, and technical enthusiasm`);
  } else {
    lines.push(`8. As a ${identityLabel}, emphasize internship experience, project work, and professional foundation`);
  }

  if (input.softSkills.length > 0) {
    lines.push(`9. Include the following skill keywords in the skills section: ${input.softSkills.join(', ')}`);
  }
  if (input.certificates.length > 0) {
    lines.push(`10. Include these certifications: ${input.certificates.join(', ')}`);
  }

  return lines.join('\n');
}

function buildOutputSchema(): string {
  return `## Output JSON Schema

Generate JSON strictly following this TypeScript interface (only include necessary fields):

\`\`\`
interface ExternalResume {
  base_info: {
    name: string;          // Use "Your Name" as placeholder
    phone?: string;        // Use "Phone Number" as placeholder
    mail?: string;         // Use "email@example.com" as placeholder
    hide_avatar?: boolean; // true
  };
  self_evaluation?: {
    content: string;       // HTML professional summary, wrapped in <p> tags
    is_hide?: boolean;
  };
  experience?: Array<{
    id: string;            // Unique ID e.g. "exp-1"
    name: string;          // Company name
    industry?: string;     // Industry
    position: string;      // Job title
    content: string;       // HTML work description, use <ul><li> for bullet points
    is_hide?: boolean;
    period: { start: string; end: string; }; // "MM/YYYY" format
  }>;
  intern?: Array<{
    id: string;
    name: string;
    industry?: string;
    position: string;
    content: string;       // HTML format
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  education?: Array<{
    id: string;
    name: string;          // School name
    major?: string;        // Major
    degree?: string;       // e.g. "Bachelor's", "Master's"
    course?: string;       // HTML format course info
    is_hide?: boolean;
    period: { start: string; end: string; };
    content?: string;
  }>;
  program_experience?: Array<{
    id: string;
    name: string;          // Project name
    role?: string;         // Role in project
    content: string;       // HTML format
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  school_exps?: Array<{
    id: string;
    name: string;          // Organization name
    position?: string;     // Role/title
    content: string;       // HTML format
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  skills?: {
    content: string;       // HTML format, use <ul><li> to list skills
    is_hide?: boolean;
  };
  qualifications?: {
    content: string;       // HTML format, wrapped in <p>
    is_hide?: boolean;
  };
}
\`\`\`

Each entry's id must be unique, using formats like "exp-1", "edu-1", "proj-1", "intern-1", "campus-1".
Omit unnecessary module fields entirely — do not set them to empty arrays.`;
}

function buildFinalInstructions(): string {
  return `## Final Requirements
1. You MUST return a valid JSON string that can be directly parsed by JSON.parse
2. Do NOT include any extra content (explanations, comments, markdown code block markers \`\`\`, etc.)
3. Do NOT include any text outside of the JSON
4. Verify JSON format validity before returning
5. All HTML content fields must contain substantive, professional content — never leave them empty
6. Do NOT generate a job preference or job intention section`;
}

function parseWorkYears(workYears: string): number {
  const match: RegExpMatchArray | null = workYears.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function generateYearsGuidance(years: number): string {
  if (years < 1) return '▶ Emphasize learning ability / internship projects / technical enthusiasm';
  if (years < 3) return '▶ Highlight technical depth / independent ownership / rapid growth';
  if (years < 5) return '▶ Showcase architecture skills / mentoring experience / core business ownership';
  return '▶ Emphasize technical leadership / team management / cross-functional collaboration / business impact';
}
