/**
 * Section-level prompt builder for AI polish & generation.
 *
 * Builds system prompts and user prompts that are:
 * - Identity-aware (student / graduate / professional)
 * - Module-aware (experience / project / campus / self-evaluation / skills)
 * - Compliance-first (fact-anchored, no fabrication)
 */
import type {
  SectionIdentity,
  SectionModuleType,
  PolishLevel,
  JobCategory,
} from '@/lib/ai/section-types';
import {
  ACTION_VERB_WHITELIST,
  ACTION_VERB_BLACKLIST,
} from '@/lib/ai/section-types';

// ---------------------------------------------------------------------------
// Identity descriptions (injected into system prompt)
// ---------------------------------------------------------------------------

const IDENTITY_CONTEXT: Record<SectionIdentity, string> = {
  student:
    'The user is a current college student looking for internships or part-time roles. ' +
    'They lack formal work experience and mainly have campus clubs, coursework, part-time jobs, and competitions. ' +
    'Help them translate campus experiences into workplace-recognizable competencies, emphasizing execution ability, learning aptitude, and transferable skills.',
  graduate:
    'The user is a recent graduate participating in campus recruitment. ' +
    'They have 0-1 years of experience with 1-2 scattered internships, and possibly a capstone or competition project. ' +
    'Help them highlight hands-on experience from internships and projects, transferable abilities, and growth potential to demonstrate readiness for full-time roles.',
  professional:
    'The user is a working professional with 1-3+ years of experience, actively job searching. ' +
    'They have formal work experience, often in execution-level roles, and need to transform "job duty lists" into "business achievement" narratives. ' +
    'Help them distill business value, core performance metrics, and problem-solving ability to differentiate from entry-level candidates.',
};

// ---------------------------------------------------------------------------
// Module-specific generation logic descriptions
// ---------------------------------------------------------------------------

const MODULE_LOGIC: Record<SectionModuleType, string> = {
  experience:
    '[Work/Internship Experience] Follow the "Action + Execution Process + Business Impact" logic. ' +
    'Remove generic duty descriptions, highlight real actions and capabilities. Strengthen quantification when user provides data; never fabricate data. ' +
    'Each entry starts with a strong action verb, explaining what was done, what tools/methods were used, and what the output was.',
  project:
    '[Project Experience] Follow the "Project Background + Personal Responsibility + Execution Actions + Project Results" logic. ' +
    'Focus on the individual\'s real contributions; never exaggerate their role in the project. ' +
    'Clearly distinguish between "personally responsible" and "team collaboration" boundaries.',
  campus:
    '[Campus Experience] Follow the "Context + Personal Actions + Tangible Results" logic. ' +
    'Transform campus experiences into workplace-recognizable competencies (organization, communication, execution, etc.). ' +
    'Never fabricate campus awards or positions.',
  'self-evaluation':
    '[Professional Summary] Follow the "1-sentence identity + 2 core matching competencies + 1 career intention" logic. ' +
    '100% based on user\'s real experience, no empty platitudes. ' +
    'Avoid generic meaningless descriptions like "passionate learner" or "hardworking". ' +
    'Adjust wording style and keyword emphasis based on the user\'s target role category.',
  skills:
    '[Skills Section] Follow the "Skill Name + Proficiency Level + Application Context" logic. ' +
    'Strictly distinguish between "basic / intermediate / proficient" levels. ' +
    'Never fabricate skills the user has not mentioned.',
};

// ---------------------------------------------------------------------------
// Core packaging strategy (default - encourages expansion and professionalization)
// ---------------------------------------------------------------------------

const PACKAGING_STRATEGY =
  '## Content Generation & Packaging Strategy\n' +
  '1. **Reasonable expansion & enriching details**: Users typically provide only a bare skeleton. Based on their limited input and industry standards for the target role, reasonably infer and supplement execution details, business context, tools, and methodologies to make the experience look polished and professional.\n' +
  '2. **Professional packaging**: Transform casual language into polished professional terminology (e.g. transform "chatted with customers" into "managed client relationships and developed engagement SOPs").\n' +
  '3. **Reasonable data embellishment**: Do not fabricate specific sensitive core metrics (e.g. exact revenue figures), but you may add reasonable scale descriptions (e.g. "processed high-volume data", "served tens of thousands of users") or use [X]% placeholders to enhance professionalism.\n' +
  '4. **Elevate experience value**: Within reasonable bounds, package basic execution work as outputs with strategic depth and business value, demonstrating the candidate\'s initiative and ownership.\n';

// ---------------------------------------------------------------------------
// Strict compliance rules (used ONLY when realistic mode is enabled)
// ---------------------------------------------------------------------------

const STRICT_COMPLIANCE_RULES =
  '## Realistic Mode (ENABLED — the following red lines MUST NOT be violated)\n' +
  '1. **Fact-anchored**: All content must be 100% based on user-provided facts. Absolutely no adding of actions, projects, data, results, or roles not mentioned by the user.\n' +
  '2. **No fabricated data**: Quantified results not provided by the user (revenue, growth rates, conversion rates, etc.) must NEVER be invented. Completely disable quantitative data generation, result exaggeration, or value inflation. Avoid any risk of falsification.\n' +
  '3. **No role inflation**: When the user "assisted/participated", do not rewrite as "led/managed/owned end-to-end". When the user is execution-level, do not use management-level language.\n' +
  '4. **No overreach**: Generated content must match the user\'s career level — do not use action verbs or content depth far beyond their seniority.\n' +
  '5. **Facts only**: Only reorganize facts, optimize phrasing, and translate into professional language. No generic meaningless filler.\n';

// ---------------------------------------------------------------------------
// Polish-level instructions
// ---------------------------------------------------------------------------

const POLISH_LEVEL_INSTRUCTIONS: Record<PolishLevel, string> = {
  basic:
    '## Polish Level: Light Edit\n' +
    'Only fix grammar, improve sentence flow, and normalize punctuation. 100% preserve the user\'s original content and structure — no additions or deletions. Do not change the information depth or expression level.',
  professional:
    '## Polish Level: Professional Polish\n' +
    'Based on the user\'s original content, reorganize logic, translate to professional workplace terminology, and optimize structure. Align with HR reading habits for the corresponding section. Do not add any content not present in the original.',
  'jd-match':
    '## Polish Level: JD-Matched Optimization\n' +
    'Based on the user\'s original content and target JD, adjust content priority, highlight core competencies matching the role, and optimize ATS keyword placement. Do not add fabricated content not in the original.',
};

// ---------------------------------------------------------------------------
// Public API: buildPolishSystemPrompt
// ---------------------------------------------------------------------------

/**
 * Builds the system prompt for section-level polish.
 */
export function buildPolishSystemPrompt(
  identity: SectionIdentity,
  moduleType: SectionModuleType,
  polishLevel: PolishLevel,
  realisticMode: boolean,
): string {
  const allowed: string = ACTION_VERB_WHITELIST[identity].join('、');
  const forbidden: string = ACTION_VERB_BLACKLIST[identity].join('、');

  const parts: string[] = [
    'You are a senior resume optimization consultant specializing in helping job seekers polish resume content into professional, compliant, and authentic expressions.',
    '',
    `## User Identity\n${IDENTITY_CONTEXT[identity]}`,
    '',
    `## Module Logic\n${MODULE_LOGIC[moduleType]}`,
    '',
    realisticMode ? STRICT_COMPLIANCE_RULES : PACKAGING_STRATEGY,
    `## Action Verb Constraints\n- Recommended action verbs: ${allowed}\n- Forbidden action verbs: ${forbidden}\n`,
    POLISH_LEVEL_INSTRUCTIONS[polishLevel],
  ];

  parts.push(
    '',
    '## Output Requirements',
    '- Output the polished content directly — no explanations, prefixes, or suffixes.',
    '- Use HTML format (<p>, <ul>, <li> tags) so content can be directly inserted into the resume editor.',
    '- Start each experience bullet with a strong action verb.',
    '- If the user provided quantified data, preserve and reasonably strengthen it; if not, never fabricate.',
  );

  return parts.join('\n');
}

/**
 * Builds the user prompt for section-level polish.
 */
export function buildPolishUserPrompt(
  content: string,
  jobDescription?: string,
): string {
  const parts: string[] = [
    'Please polish and optimize the following resume section:',
    '',
    '---',
    content,
    '---',
  ];

  if (jobDescription?.trim()) {
    parts.push(
      '',
      'Target Job Description:',
      '---',
      jobDescription.trim(),
      '---',
    );
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Public API: buildGenerateSystemPrompt
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Job Category context for self-evaluation
// ---------------------------------------------------------------------------

const JOB_CATEGORY_CONTEXT: Record<JobCategory, string> = {
  functional:
    'Target role type: Functional/Administrative (HR, Finance, Legal, Admin, etc.). ' +
    'Summary should emphasize: attention to detail, compliance awareness, process optimization, cross-department coordination and support. ' +
    'Keyword direction: compliance, process management, reporting, policy development, internal coordination.',
  business:
    'Target role type: Business (Operations, Marketing, Product, Sales, etc.). ' +
    'Summary should emphasize: user insight, data-driven thinking, growth orientation, cross-team execution, business acumen. ' +
    'Keyword direction: user growth, conversion optimization, data analysis, demand insight, business lifecycle.',
  technical:
    'Target role type: Technical (Frontend, Backend, ML/AI, QA, etc.). ' +
    'Summary should emphasize: tech stack depth, engineering practice, debugging & problem-solving, code quality, technical vision. ' +
    'Keyword direction: architecture design, performance optimization, code quality, tech selection, continuous learning.',
  'state-owned':
    'Target role type: Government/Public Sector (state-owned enterprises, public institutions, etc.). ' +
    'Summary should emphasize: organizational awareness, compliance with directives, diligence, teamwork, discipline. ' +
    'Style: formal and measured tone, avoid startup/tech jargon, convey values of loyalty, responsibility, and pragmatism. ' +
    'Keyword direction: organizational discipline, teamwork, accountability, adaptability, continuous learning.',
};

/**
 * Builds the system prompt for section-level content generation.
 */
export function buildGenerateSystemPrompt(
  identity: SectionIdentity,
  moduleType: SectionModuleType,
  jobCategory?: JobCategory,
  realisticMode: boolean = false,
): string {
  const allowed: string = ACTION_VERB_WHITELIST[identity].join('、');
  const forbidden: string = ACTION_VERB_BLACKLIST[identity].join('、');

  const parts: string[] = [
    'You are a senior resume writing consultant specializing in helping job seekers generate professional, compliant resume section content based on real experience.',
    '',
    `## User Identity\n${IDENTITY_CONTEXT[identity]}`,
    '',
    `## Module Logic\n${MODULE_LOGIC[moduleType]}`,
  ];

  if (jobCategory && moduleType === 'self-evaluation') {
    parts.push('', `## Target Role Category\n${JOB_CATEGORY_CONTEXT[jobCategory]}`);
  }

  parts.push(
    '',
    realisticMode ? STRICT_COMPLIANCE_RULES : PACKAGING_STRATEGY,
    `## Action Verb Constraints\n- Recommended action verbs: ${allowed}\n- Forbidden action verbs: ${forbidden}\n`,
    '',
    '## Output Requirements',
    '- Output the generated content directly — no explanations, prefixes, or suffixes.',
    '- Use HTML format (<p>, <ul>, <li> tags) so content can be directly inserted into the resume editor.',
    '- 100% based on user-provided information. In default mode, reasonably expand and package; in realistic mode, strictly adhere to facts.',
    '- If the user provides extremely limited information, do your best to create a maximally professional expression from what\'s available.',
    '- If missing information prevents generating meaningful content, use placeholder [Suggested: xxx] to prompt the user.',
  );

  return parts.join('\n');
}

/**
 * Builds the user prompt for section-level content generation from guided answers.
 */
export function buildGenerateUserPrompt(
  answers: Record<string, string>,
  jobDescription?: string,
): string {
  const parts: string[] = [
    'Please generate resume section content based on the following information:',
    '',
  ];

  for (const [question, answer] of Object.entries(answers)) {
    if (answer.trim()) {
      parts.push(`**${question}**: ${answer}`);
    }
  }

  if (jobDescription?.trim()) {
    parts.push(
      '',
      'Target Job Description:',
      '---',
      jobDescription.trim(),
      '---',
    );
  }

  return parts.join('\n');
}
