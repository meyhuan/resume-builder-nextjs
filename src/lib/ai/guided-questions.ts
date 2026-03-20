/**
 * Guided questions configuration for AI section content generation.
 *
 * Questions are organized by module type × identity, with required/optional markers.
 * The "AI Write for Me" flow uses these to collect user facts before generation.
 */
import type { SectionIdentity, SectionModuleType } from '@/lib/ai/section-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuidedQuestion {
  readonly key: string;
  readonly label: string;
  readonly placeholder: string;
  readonly required: boolean;
  readonly multiline?: boolean;
  /** If set, this question can be auto-filled from the block's structured data. */
  readonly autoFillKey?: string;
}

export interface GuidedQuestionSet {
  readonly questions: readonly GuidedQuestion[];
}

// ---------------------------------------------------------------------------
// Experience module questions
// ---------------------------------------------------------------------------

const EXPERIENCE_QUESTIONS_STUDENT: GuidedQuestionSet = {
  questions: [
    { key: 'companyAndRole', label: 'Company + Internship Role + Duration', placeholder: 'e.g.: Google, Content Marketing Intern, 2025.01-2025.06', required: true, autoFillKey: 'companyAndRole' },
    { key: 'dailyWork', label: 'What were your main daily responsibilities?', placeholder: 'Describe what you did each day — the more detail the better', required: true, multiline: true },
    { key: 'collaboration', label: 'What specific projects or tasks did you contribute to?', placeholder: 'e.g.: Helped the team plan and execute a marketing campaign', required: true, multiline: true },
    { key: 'tools', label: 'What tools or skills did you use?', placeholder: 'e.g.: Excel, Figma, Python, Notion, etc.', required: false },
    { key: 'standards', label: 'What standards or processes did this role follow?', placeholder: 'e.g.: Followed SOP workflows, content review guidelines', required: false },
    { key: 'learning', label: 'What did you learn from this internship?', placeholder: 'e.g.: Learned the fundamentals of data analysis', required: false },
  ],
};

const EXPERIENCE_QUESTIONS_GRADUATE: GuidedQuestionSet = {
  questions: [
    { key: 'companyAndRole', label: 'Company + Role + Duration', placeholder: 'e.g.: Amazon, Product Ops Intern, 2024.06-2024.12', required: true, autoFillKey: 'companyAndRole' },
    { key: 'dailyWork', label: 'What were your core responsibilities?', placeholder: 'Describe your main work in detail', required: true, multiline: true },
    { key: 'achievements', label: 'What did you independently complete or drive?', placeholder: 'e.g.: Wrote requirements docs for the onboarding module', required: true, multiline: true },
    { key: 'tools', label: 'What tools or tech stack did you use?', placeholder: 'e.g.: SQL, Tableau, Axure, JIRA', required: false },
    { key: 'results', label: 'What were the outcomes? (include data if available)', placeholder: 'e.g.: Delivered 3 PRDs covering 2 core feature modules', required: false, multiline: true },
  ],
};

const EXPERIENCE_QUESTIONS_PROFESSIONAL: GuidedQuestionSet = {
  questions: [
    { key: 'companyAndRole', label: 'Company + Job Title + Duration', placeholder: 'e.g.: Microsoft, Senior Product Manager, 2023.03-Present', required: true, autoFillKey: 'companyAndRole' },
    { key: 'dailyWork', label: 'What were your core responsibilities?', placeholder: 'Describe your core business scope and ownership', required: true, multiline: true },
    { key: 'achievements', label: 'What major projects or initiatives did you lead?', placeholder: 'e.g.: Led the V2.0 redesign of the internal analytics platform', required: true, multiline: true },
    { key: 'results', label: 'What business results did you achieve? (include data if available)', placeholder: 'e.g.: User engagement increased 20%, DAU grew from 50K to 60K', required: false, multiline: true },
    { key: 'tools', label: 'Core tech stack / tools / methodologies?', placeholder: 'e.g.: Agile, OKR, data-driven decision making', required: false },
    { key: 'challenges', label: 'What challenges did you face and how did you solve them?', placeholder: 'e.g.: Concurrency issues — resolved via caching and message queues', required: false, multiline: true },
  ],
};

// ---------------------------------------------------------------------------
// Project module questions
// ---------------------------------------------------------------------------

const PROJECT_QUESTIONS_STUDENT: GuidedQuestionSet = {
  questions: [
    { key: 'projectName', label: 'Project Name + Your Role + Duration', placeholder: 'e.g.: Campus Marketplace, Frontend Dev, 2024.09-2024.12', required: true, autoFillKey: 'projectNameAndRole' },
    { key: 'background', label: 'What was the project background/purpose?', placeholder: 'e.g.: Course capstone project to build a campus trading platform', required: true, multiline: true },
    { key: 'personalWork', label: 'What did you personally do?', placeholder: 'Describe your specific contributions, not the team\'s overall work', required: true, multiline: true },
    { key: 'tools', label: 'What technologies/tools did you use?', placeholder: 'e.g.: React, Node.js, MySQL', required: false },
    { key: 'result', label: 'What was the final outcome?', placeholder: 'e.g.: Successfully launched and adopted by 200+ students on campus', required: false },
  ],
};

const PROJECT_QUESTIONS_GRADUATE: GuidedQuestionSet = {
  questions: [
    { key: 'projectName', label: 'Project Name + Your Role + Duration', placeholder: 'e.g.: AI Chatbot System, Backend Dev, 2024.03-2024.08', required: true, autoFillKey: 'projectNameAndRole' },
    { key: 'background', label: 'What was the project background and goal?', placeholder: 'e.g.: Built an AI chatbot to improve customer support efficiency', required: true, multiline: true },
    { key: 'personalWork', label: 'What part were you personally responsible for?', placeholder: 'Describe only your own contributions, not the team\'s', required: true, multiline: true },
    { key: 'tools', label: 'Core tech stack?', placeholder: 'e.g.: Spring Boot, Redis, Elasticsearch', required: false },
    { key: 'result', label: 'Project outcomes and your contribution? (include data if available)', placeholder: 'e.g.: System processed 5K+ inquiries/day after launch', required: false, multiline: true },
  ],
};

const PROJECT_QUESTIONS_PROFESSIONAL: GuidedQuestionSet = {
  questions: [
    { key: 'projectName', label: 'Project Name + Your Role + Duration', placeholder: 'e.g.: User Growth System, Project Lead, 2023.06-2024.01', required: true, autoFillKey: 'projectNameAndRole' },
    { key: 'background', label: 'Project background and business goal?', placeholder: 'e.g.: Company hit a growth plateau, needed a systematic growth framework', required: true, multiline: true },
    { key: 'personalWork', label: 'What core work did you lead/own?', placeholder: 'Describe your key contributions and decisions', required: true, multiline: true },
    { key: 'result', label: 'Business outcomes? (include data if available)', placeholder: 'e.g.: 50K new sign-ups in 3 months, CAC reduced by 30%', required: false, multiline: true },
    { key: 'challenges', label: 'What technical/business challenges did you face? How did you solve them?', placeholder: 'e.g.: Data silos — resolved by building a unified data platform', required: false, multiline: true },
  ],
};

// ---------------------------------------------------------------------------
// Campus module questions
// ---------------------------------------------------------------------------

const CAMPUS_QUESTIONS: GuidedQuestionSet = {
  questions: [
    { key: 'orgAndRole', label: 'Organization/Club + Your Role + Duration', placeholder: 'e.g.: Student Council, VP of Outreach, 2023.09-2024.06', required: true, autoFillKey: 'orgAndRole' },
    { key: 'activities', label: 'What specific things did you do?', placeholder: 'e.g.: Organized campus events, secured sponsorships', required: true, multiline: true },
    { key: 'result', label: 'What were the results?', placeholder: 'e.g.: Events attracted 500+ attendees, secured 3 sponsors', required: false, multiline: true },
    { key: 'skills', label: 'What skills did you develop?', placeholder: 'e.g.: Communication, event planning, leadership', required: false },
  ],
};

// ---------------------------------------------------------------------------
// Self-evaluation module questions
// ---------------------------------------------------------------------------

const SELF_EVALUATION_QUESTIONS_STUDENT: GuidedQuestionSet = {
  questions: [
    { key: 'coreStrength', label: 'What do you consider your greatest strengths?', placeholder: 'e.g.: Fast learner, strong communicator, passionate about design', required: true, multiline: true },
    { key: 'relevantExperience', label: 'Any experience related to your target role?', placeholder: 'e.g.: Interned at XX, participated in XX project', required: true },
    { key: 'jobWish', label: 'What are your career goals for this role?', placeholder: 'e.g.: Looking to grow in UX design, available for long-term internship', required: false },
  ],
};

const SELF_EVALUATION_QUESTIONS_GRADUATE: GuidedQuestionSet = {
  questions: [
    { key: 'coreStrength', label: 'What is your core competitive advantage?', placeholder: 'e.g.: Internship at XX, proficient in XX, strong analytical skills', required: true, multiline: true },
    { key: 'relevantExperience', label: 'What experience best matches your target role?', placeholder: 'e.g.: Led the XX project during my internship at XX', required: true },
    { key: 'jobWish', label: 'What are your career development goals?', placeholder: 'e.g.: Looking for long-term growth in the fintech industry', required: false },
  ],
};

const SELF_EVALUATION_QUESTIONS_PROFESSIONAL: GuidedQuestionSet = {
  questions: [
    { key: 'coreStrength', label: 'What are your core professional capabilities?', placeholder: 'e.g.: 5 years in data engineering, expert in XX, strong in XX methodology', required: true, multiline: true },
    { key: 'achievements', label: 'What is your most notable business achievement?', placeholder: 'e.g.: Led XX project that achieved XX result', required: true },
    { key: 'jobWish', label: 'What is your career direction and plan?', placeholder: 'e.g.: Want to continue growing in XX, targeting a senior/lead role', required: false },
  ],
};

// ---------------------------------------------------------------------------
// Skills module questions
// ---------------------------------------------------------------------------

const SKILLS_QUESTIONS: GuidedQuestionSet = {
  questions: [
    { key: 'hardSkills', label: 'What professional/technical skills do you have?', placeholder: 'e.g.: Python (proficient), SQL (intermediate), Photoshop (basic)', required: true, multiline: true },
    { key: 'softSkills', label: 'What are your soft skills?', placeholder: 'e.g.: Team collaboration, cross-functional communication, project management', required: false },
    { key: 'certifications', label: 'Relevant certifications?', placeholder: 'e.g.: AWS Certified, PMP, TOEFL 110', required: false },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the guided question set for a given module type and identity.
 */
export function getGuidedQuestions(
  moduleType: SectionModuleType,
  identity: SectionIdentity,
): GuidedQuestionSet {
  switch (moduleType) {
    case 'experience':
      return identity === 'student'
        ? EXPERIENCE_QUESTIONS_STUDENT
        : identity === 'graduate'
          ? EXPERIENCE_QUESTIONS_GRADUATE
          : EXPERIENCE_QUESTIONS_PROFESSIONAL;
    case 'project':
      return identity === 'student'
        ? PROJECT_QUESTIONS_STUDENT
        : identity === 'graduate'
          ? PROJECT_QUESTIONS_GRADUATE
          : PROJECT_QUESTIONS_PROFESSIONAL;
    case 'campus':
      return CAMPUS_QUESTIONS;
    case 'self-evaluation':
      return identity === 'student'
        ? SELF_EVALUATION_QUESTIONS_STUDENT
        : identity === 'graduate'
          ? SELF_EVALUATION_QUESTIONS_GRADUATE
          : SELF_EVALUATION_QUESTIONS_PROFESSIONAL;
    case 'skills':
      return SKILLS_QUESTIONS;
    default:
      return SKILLS_QUESTIONS;
  }
}
