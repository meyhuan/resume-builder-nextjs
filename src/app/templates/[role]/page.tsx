import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronRight, CircleCheckBig, ClipboardList, Layers3, Tags, Target, TriangleAlert, Users } from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { getAllArticles } from '@/lib/articles/article-data';
import type { Article } from '@/lib/articles/article-types';
import { templateCatalog } from '@/lib/templates/template-catalog';
import { templateRoleData } from '@/lib/templates/template-role-data';

const SITE_URL: string = 'https://airesumepass.com';

type JsonLdPrimitive = string | number | boolean;

type JsonLdNode = {
  [key: string]: JsonLdPrimitive | JsonLdNode | JsonLdNode[] | JsonLdPrimitive[] | undefined;
};

type RolePageParams = {
  params: Promise<{
    role: string;
  }>;
};

type WritingPoint = {
  title: string;
  description: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type AudienceProfile = {
  title: string;
  description: string;
};

type ResumeSectionSuggestion = {
  title: string;
  description: string;
};

type HiringFocusItem = {
  title: string;
  description: string;
};

type DeliverySuggestion = {
  title: string;
  description: string;
};

function createPageTitle(roleName: string): string {
  return `${roleName} Resume Template - How to Write a ${roleName} Resume | AI Resume Pass`;
}

function createPageDescription(roleName: string, industry: string): string {
  return `Explore resume templates, writing tips, common mistakes, and AI resume generation advice for ${roleName} positions in ${industry}. Build a job-ready resume faster.`;
}

function createRoleSummary(roleName: string, industry: string, category: string): string {
  if (category === 'Engineering') {
    return `${roleName} roles typically focus on tech stack alignment, project complexity, problem-solving ability, and your capacity to deliver reliably in ${industry} environments.`;
  }
  if (category === 'Product') {
    return `${roleName} roles emphasize requirement analysis, solution design, cross-team collaboration, and version delivery. Recruiters want to see that you've driven real business outcomes.`;
  }
  if (category === 'Operations' || category === 'Marketing') {
    return `${roleName} roles value growth mindset, execution planning, data-driven reviews, and measurable results. Your experience should reflect business goals and actual output.`;
  }
  if (category === 'Design') {
    return `${roleName} roles focus on portfolio quality, design rationale, UX understanding, and cross-functional collaboration. Your resume should clearly convey the value of your solutions.`;
  }
  return `${roleName} hiring typically evaluates role fit, professional skills, past achievements, and consistent execution. Prioritize your most relevant experience.`;
}

function createWritingPoints(roleName: string, category: string): readonly WritingPoint[] {
  return [
    {
      title: 'Lead with Role Fit',
      description: `Start your ${roleName} resume by showing role alignment — prioritize projects, achievements, and responsibilities related to ${category}.`,
    },
    {
      title: 'Write Results, Not Just Duties',
      description: `Don't just list responsibilities. Clearly state what you did in ${roleName}-related experiences, what problems you solved, and what results you delivered.`,
    },
    {
      title: 'Match Keywords to the JD',
      description: `Naturally incorporate key terms from the job description — tools, methodologies, business contexts, and metrics — to help your ${roleName} resume pass initial screening.`,
    },
  ];
}

function countKeywordMatches(content: string, keywords: readonly string[]): number {
  return keywords.reduce((score: number, keyword: string) => {
    if (!keyword) {
      return score;
    }
    return content.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
}

function getRecommendedArticlesForRole(
  roleName: string,
  industry: string,
  category: string,
  searchKeywords: readonly string[],
): Article[] {
  const allArticles: Article[] = getAllArticles();
  const relevanceKeywords: string[] = [roleName, industry, category, ...searchKeywords];
  return allArticles
    .map((article: Article) => {
      const normalizedContent: string = `${article.title} ${article.abstract} ${article.tags.join(' ')} ${article.textContent}`.toLowerCase();
      let relevanceScore: number = countKeywordMatches(normalizedContent, relevanceKeywords.map((keyword: string) => keyword.toLowerCase()));
      if (article.title.includes(roleName)) {
        relevanceScore += 4;
      }
      if (article.abstract.includes(roleName)) {
        relevanceScore += 2;
      }
      if (article.tags.some((tag: string) => roleName.includes(tag) || tag.includes(roleName) || searchKeywords.includes(tag))) {
        relevanceScore += 2;
      }
      return {
        article,
        relevanceScore,
      };
    })
    .filter((entry: { article: Article; relevanceScore: number }) => entry.relevanceScore > 0)
    .sort((left: { article: Article; relevanceScore: number }, right: { article: Article; relevanceScore: number }) => right.relevanceScore - left.relevanceScore)
    .slice(0, 4)
    .map((entry: { article: Article; relevanceScore: number }) => entry.article);
}

function createAudienceProfiles(roleName: string, industry: string, category: string): readonly AudienceProfile[] {
  return [
    {
      title: `People with ${category} experience`,
      description: `If you have project, internship, or work experience related to ${category}, this ${roleName} page helps you highlight role fit and articulate achievements.`,
    },
    {
      title: 'Career changers targeting this role',
      description: `If you're transitioning from a related function to ${roleName}, use this page to organize experiences, keywords, and phrasing relevant to ${industry}.`,
    },
    {
      title: 'People who need a job-ready resume fast',
      description: `If you want a well-structured resume draft first and then optimize for specific JDs, this ${roleName} template page is a great starting point.`,
    },
  ];
}

function createResumeSectionSuggestions(roleName: string, category: string): readonly ResumeSectionSuggestion[] {
  if (category === 'Engineering') {
    return [
      {
        title: 'Project Experience',
        description: `Prioritize projects most relevant to the ${roleName} role. Specify tech stack, business context, your responsibilities, and outcomes.`,
      },
      {
        title: 'Tech Stack & Tools',
        description: `List core frameworks, languages, engineering tools, and collaboration methods separately so recruiters can quickly assess your fit for ${roleName}.`,
      },
      {
        title: 'Performance & Efficiency Improvements',
        description: 'If you have stability, performance, deployment efficiency, or incident response achievements, quantify them to strengthen your case.',
      },
    ];
  }
  if (category === 'Design') {
    return [
      {
        title: 'Portfolio & Case Studies',
        description: `Select cases that best demonstrate your abilities for ${roleName} scenarios. Highlight the problem, solution, and final outcome.`,
      },
      {
        title: 'Design Process & Collaboration',
        description: 'Explain how you conduct research, deliver solutions, collaborate with product and engineering, and drive implementation.',
      },
      {
        title: 'Business Impact & UX Improvements',
        description: 'If your designs improved conversion, retention, satisfaction, or efficiency, include those results directly in your resume.',
      },
    ];
  }
  if (category === 'Operations' || category === 'Marketing') {
    return [
      {
        title: 'Business Goals & Metrics',
        description: `When applying for ${roleName}, the most important thing is to clearly present growth, conversion, retention, acquisition, or campaign results.`,
      },
      {
        title: 'Channels & Strategy Breakdown',
        description: 'Describe which channels you managed, what actions you took, and the rationale behind your approach.',
      },
      {
        title: 'Review & Optimization Ability',
        description: 'Show how you adjusted strategies based on data feedback — this is more valuable than simply describing execution.',
      },
    ];
  }
  return [
    {
      title: 'Core Work Experience',
      description: `Put the experience that best proves your fit for ${roleName} first. Highlight scope, problem-solving, and outcomes.`,
    },
    {
      title: 'Professional Skills & Tools',
      description: `List methods, tools, systems, and processes directly related to ${roleName} to help recruiters quickly assess your qualifications.`,
    },
    {
      title: 'Quantifiable Results',
      description: 'Use numbers to present efficiency, accuracy, delivery quality, cost optimization, or team collaboration outcomes wherever possible.',
    },
  ];
}

function createKeywordSuggestions(roleName: string, category: string, searchKeywords: readonly string[]): readonly string[] {
  const categoryKeywords: Record<string, readonly string[]> = {
    Engineering: ['tech stack', 'system design', 'performance optimization', 'reliability', 'project delivery'],
    Product: ['requirement analysis', 'product roadmap', 'user research', 'cross-team collaboration', 'iteration'],
    Operations: ['growth', 'conversion rate', 'retention', 'campaign review', 'channel operations'],
    Design: ['design system', 'interaction flow', 'visual standards', 'user experience', 'implementation'],
    Marketing: ['brand awareness', 'ad optimization', 'content strategy', 'lead conversion', 'campaigns'],
  };
  const mergedKeywords: string[] = [...(categoryKeywords[category] ?? []), ...searchKeywords, roleName];
  return Array.from(new Set<string>(mergedKeywords)).slice(0, 8);
}

function createHiringFocusItems(roleName: string, industry: string, category: string): readonly HiringFocusItem[] {
  if (category === 'Engineering') {
    return [
      {
        title: 'Tech stack alignment with role requirements',
        description: `Recruiters first check whether your languages, frameworks, and engineering tools match the ${roleName} job requirements.`,
      },
      {
        title: 'Real projects with meaningful complexity',
        description: 'Rather than generic duty descriptions, what matters is the problems you solved and the core work you owned.',
      },
      {
        title: 'Delivery outcomes and reliability mindset',
        description: `If you can show how you handled performance optimization, debugging, or release stability in ${industry}, it adds significant credibility.`,
      },
    ];
  }
  if (category === 'Product') {
    return [
      {
        title: 'Requirement judgment and problem definition',
        description: `Recruiters want to see if you truly understood user problems and translated them into solutions a ${roleName} would drive.`,
      },
      {
        title: 'Cross-team driving ability',
        description: 'Writing PRDs alone isn\'t enough — show how you collaborated with design, engineering, and operations to ship results.',
      },
      {
        title: 'Clear business outcomes',
        description: 'If you can cite conversion, retention, efficiency, or satisfaction changes after a release, it greatly increases your value.',
      },
    ];
  }
  if (category === 'Operations' || category === 'Marketing') {
    return [
      {
        title: 'Strong metrics awareness',
        description: `When applying for ${roleName}, recruiters typically prioritize growth, conversion, leads, impressions, or retention metrics.`,
      },
      {
        title: 'Systematic strategy and execution',
        description: 'Don\'t just state what you did — explain why you did it, how you broke down goals, and how you reviewed results.',
      },
      {
        title: 'Resource coordination and delivery efficiency',
        description: `If your experience demonstrates cross-team collaboration, resource integration, and pacing, it aligns better with ${industry} role expectations.`,
      },
    ];
  }
  if (category === 'Design') {
    return [
      {
        title: 'Work that reflects design thinking',
        description: `Recruiters look beyond aesthetics — they want to see if your work truly solved problems in ${roleName} scenarios.`,
      },
      {
        title: 'Implementation and collaboration skills',
        description: 'Visual mockups alone aren\'t enough. Showing how you drove designs to production builds more trust.',
      },
      {
        title: 'Verifiable UX improvements',
        description: 'Quantified improvements in conversion, satisfaction, task completion, or efficiency make your resume significantly stronger.',
      },
    ];
  }
  return [
    {
      title: 'Clear role fit',
      description: `Recruiters first assess whether your past experience supports the ${roleName} role requirements.`,
    },
    {
      title: 'Direct professional competence',
      description: 'Minimize vague descriptions — let people quickly see transferable or verifiable skills.',
    },
    {
      title: 'Credible results and consistency',
      description: `Proving yourself with outcomes, processes, and context makes it easier to land ${industry}-related interview opportunities.`,
    },
  ];
}

function createDeliverySuggestions(roleName: string, category: string): readonly DeliverySuggestion[] {
  if (category === 'Engineering') {
    return [
      {
        title: 'Put your strongest project first',
        description: `Place the project closest to your target ${roleName} role in the first two entries to establish technical fit immediately.`,
      },
      {
        title: 'Rewrite duties as problems and results',
        description: 'Don\'t just say what you developed — explain the problem you solved, how you implemented it, and the outcome.',
      },
      {
        title: 'Swap keywords to match the JD',
        description: 'Before submitting, reorder tech stack, business terms, and engineering keywords based on the JD.',
      },
    ];
  }
  if (category === 'Product') {
    return [
      {
        title: 'Lead with your most business-savvy experience',
        description: 'Prioritize the experience that best shows you defining problems, decomposing requirements, and driving solutions.',
      },
      {
        title: 'Make the product lifecycle complete',
        description: 'From requirement source, solution rationale, stakeholders, to launch results — form a closed-loop narrative.',
      },
      {
        title: 'Write rationale, not just process labels',
        description: 'Instead of "managed requirements", recruiters want to see why you made those decisions and the outcome.',
      },
    ];
  }
  if (category === 'Operations' || category === 'Marketing') {
    return [
      {
        title: 'Lead with results, then actions',
        description: 'Start with a one-line summary of impressions, conversion, growth, or retention results, then detail your actions.',
      },
      {
        title: 'Separate channels from strategy',
        description: 'This makes it easier to show you can both execute and make strategic judgment calls with post-mortem analysis.',
      },
      {
        title: 'Add review and optimization actions',
        description: 'Execution without optimization suggests lack of depth in your experience.',
      },
    ];
  }
  if (category === 'Design') {
    return [
      {
        title: 'Use case studies, not task lists',
        description: `When applying for ${roleName}, structure entries around complete cases: problem, process, solution, and result.`,
      },
      {
        title: 'Let portfolio and resume reinforce each other',
        description: 'Key projects mentioned in your resume should have corresponding cases in your portfolio.',
      },
      {
        title: 'Articulate the value of your design',
        description: 'Go beyond visual aesthetics — emphasize UX improvements, business impact, and implementation collaboration.',
      },
    ];
  }
  return [
    {
      title: 'Make your target role crystal clear',
      description: `Title, summary, and key experiences should all center around ${roleName} — avoid a scattered focus.`,
    },
    {
      title: 'Front-load your most relevant experience',
      description: 'Recruiters typically skim only the top half of the page, so critical information must appear first.',
    },
    {
      title: 'Make achievements verifiable',
      description: 'Use numbers, scenarios, and outcomes to support your abilities rather than abstract self-assessments.',
    },
  ];
}

function createTemplateReason(templateId: string, category: string): string {
  const templateReasonMap: Record<string, Record<string, string>> = {
    Engineering: {
      simple: 'Clear information hierarchy, ideal for showcasing tech stack, project experience, and engineering outcomes.',
      timeline: 'Timeline format is more intuitive for showing continuous projects and career growth.',
      warm: 'Maintains clear structure with more visual identity, suitable for comprehensive expression.',
      elegant: 'Great for technical management or cross-functional roles that need both professionalism and polish.',
    },
    Product: {
      warm: 'Layout is well-suited for presenting project context, requirement breakdowns, and business results.',
      simple: 'Clean structure, ideal for emphasizing logic and cross-team collaboration.',
      elegant: 'Fits product roles that need a more mature professional presence.',
      timeline: 'Good for emphasizing version progression and career growth trajectory.',
    },
    Operations: {
      warm: 'Best for accommodating campaigns, growth, content, and multi-dimensional data results.',
      simple: 'Great for highlighting metric outcomes with minimal visual distraction.',
      elegant: 'Suited for brand, business, or externally-facing roles requiring polished presentation.',
      timeline: 'Works well for showing operational strategies and phased result changes.',
    },
    Design: {
      warm: 'Balances visual expression and readability, ideal for design roles to showcase personal style.',
      elegant: 'More refined overall, suitable for emphasizing aesthetics and mature expression.',
      simple: 'Works as a clean complement to your portfolio, highlighting projects and skills directly.',
      timeline: 'Good for showcasing project cases and growth trajectory across different stages.',
    },
  };
  return templateReasonMap[category]?.[templateId] ?? 'Stable structure with low reading burden, ideal for quick generation and tailoring to your target role.';
}

function createBreadcrumbSchema(roleName: string, roleSlug: string): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Resume Templates',
        item: `${SITE_URL}/templates`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${roleName} Resume Template`,
        item: `${SITE_URL}/templates/${roleSlug}`,
      },
    ],
  };
}

function createFaqSchema(faqItems: readonly FaqItem[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item: FaqItem) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function createMistakes(roleName: string): readonly string[] {
  return [
    `Your ${roleName} resume title and career direction are unclear — recruiters can't tell what role you're targeting after reading the first page.`,
    `Project descriptions are process-only with no quantified results, failing to demonstrate your value for the ${roleName} position.`,
    'Keywords across the entire resume are too generic, with no targeted optimization for the specific job description.',
  ];
}

function createFaqItems(roleName: string): readonly FaqItem[] {
  return [
    {
      question: `Which resume template style should I choose for a ${roleName} role?`,
      answer: 'Choose a template with a clear structure and balanced information density so recruiters can quickly locate your key experience and strengths.',
    },
    {
      question: `Can I generate a ${roleName} resume directly with AI?`,
      answer: 'Yes — start with an AI-generated draft, then manually adjust keywords, experience order, and achievement phrasing to match the target JD for best results.',
    },
    {
      question: `What's the most commonly overlooked detail in a ${roleName} resume?`,
      answer: 'Achievement expression and keyword alignment with the role are most often overlooked — both directly impact your initial screening pass rate.',
    },
  ];
}

export async function generateStaticParams(): Promise<{ role: string }[]> {
  return templateRoleData.getAllTemplateRoles().map((role) => ({ role: role.slug }));
}

export async function generateMetadata({ params }: RolePageParams): Promise<Metadata> {
  const resolvedParams = await params;
  const roleRecord = templateRoleData.getTemplateRoleBySlug(resolvedParams.role);
  if (!roleRecord) {
    return {
      title: 'Role Template Not Found',
    };
  }
  const title: string = createPageTitle(roleRecord.role);
  const description: string = createPageDescription(roleRecord.role, roleRecord.industry);
  return {
    title,
    description,
    keywords: [
      `${roleRecord.role} resume template`,
      `how to write a ${roleRecord.role} resume`,
      `${roleRecord.role} AI resume`,
      `${roleRecord.role} job resume`,
      ...roleRecord.searchKeywords,
    ],
    alternates: {
      canonical: `${SITE_URL}/templates/${roleRecord.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/templates/${roleRecord.slug}`,
      type: 'article',
    },
  };
}

export default async function TemplateRolePage({ params }: RolePageParams): Promise<ReactElement> {
  const resolvedParams = await params;
  const roleRecord = templateRoleData.getTemplateRoleBySlug(resolvedParams.role);
  if (!roleRecord) {
    notFound();
  }
  const recommendedTemplates = templateCatalog
    .filter((template) => roleRecord.recommendedTemplateIds.includes(template.id))
    .map((template) => ({
      ...template,
      fitReason: createTemplateReason(template.id, roleRecord.category),
    }));
  const recommendedArticles: Article[] = getRecommendedArticlesForRole(
    roleRecord.role,
    roleRecord.industry,
    roleRecord.category,
    roleRecord.searchKeywords,
  );
  const relatedRoles = templateRoleData.getRelatedTemplateRoles(roleRecord.slug, 8);
  const writingPoints = createWritingPoints(roleRecord.role, roleRecord.category);
  const roleSummary = createRoleSummary(roleRecord.role, roleRecord.industry, roleRecord.category);
  const audienceProfiles = createAudienceProfiles(roleRecord.role, roleRecord.industry, roleRecord.category);
  const resumeSectionSuggestions = createResumeSectionSuggestions(roleRecord.role, roleRecord.category);
  const keywordSuggestions = createKeywordSuggestions(roleRecord.role, roleRecord.category, roleRecord.searchKeywords);
  const hiringFocusItems = createHiringFocusItems(roleRecord.role, roleRecord.industry, roleRecord.category);
  const deliverySuggestions = createDeliverySuggestions(roleRecord.role, roleRecord.category);
  const commonMistakes = createMistakes(roleRecord.role);
  const faqItems = createFaqItems(roleRecord.role);
  const breadcrumbSchema: JsonLdNode = createBreadcrumbSchema(roleRecord.role, roleRecord.slug);
  const faqSchema: JsonLdNode = createFaqSchema(faqItems);
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <LandingHeader forceSolid />
      <main className="flex-grow pt-36 pb-20 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-8%] right-[-5%] w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-8%] left-[-5%] w-[400px] h-[400px] bg-fuchsia-500/8 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 flex-wrap">
            <Link href="/" className="hover:text-violet-600 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/templates" className="hover:text-violet-600 transition-colors">Resume Templates</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 font-medium">{roleRecord.role} Resume Template</span>
          </nav>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-50 text-violet-600 rounded-full text-sm font-semibold">
              <BriefcaseBusiness className="w-4 h-4" />
              {roleRecord.industry} / {roleRecord.category}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mt-5">
              {roleRecord.role} Resume Template & Writing Tips
            </h1>
            <p className="text-base md:text-lg text-slate-500 mt-4 max-w-3xl leading-relaxed">
              {createPageDescription(roleRecord.role, roleRecord.industry)}
            </p>
            <p className="text-sm md:text-base text-slate-600 mt-4 max-w-3xl leading-relaxed">
              {roleSummary}
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/ai" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors">
                AI Generate {roleRecord.role} Resume
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/editor" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors">
                Start Editing
              </Link>
            </div>
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <h2 className="text-2xl font-extrabold text-slate-900">How to Write a {roleRecord.role} Resume</h2>
              <div className="space-y-4 mt-6">
                {writingPoints.map((point) => (
                  <div key={point.title} className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <CircleCheckBig className="w-4 h-4 text-violet-500" />
                      {point.title}
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2">{point.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <h2 className="text-2xl font-extrabold text-slate-900">Common Mistakes</h2>
              <div className="space-y-4 mt-6">
                {commonMistakes.map((mistake) => (
                  <div key={mistake} className="rounded-2xl bg-rose-50 p-5 border border-rose-100">
                    <div className="flex items-start gap-3">
                      <TriangleAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 leading-relaxed">{mistake}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 text-slate-900">
                <Target className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">What Recruiters Focus On</h2>
              </div>
              <div className="space-y-4 mt-6">
                {hiringFocusItems.map((item: HiringFocusItem) => (
                  <div key={item.title} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 text-slate-900">
                <ClipboardList className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">Application Optimization Tips</h2>
              </div>
              <div className="space-y-4 mt-6">
                {deliverySuggestions.map((suggestion: DeliverySuggestion) => (
                  <div key={suggestion.title} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                    <h3 className="text-base font-bold text-slate-900">{suggestion.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2">{suggestion.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8 lg:col-span-1">
              <div className="flex items-center gap-2 text-slate-900">
                <Users className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">Who This Is For</h2>
              </div>
              <div className="space-y-4 mt-6">
                {audienceProfiles.map((profile: AudienceProfile) => (
                  <div key={profile.title} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                    <h3 className="text-base font-bold text-slate-900">{profile.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2">{profile.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8 lg:col-span-1">
              <div className="flex items-center gap-2 text-slate-900">
                <Layers3 className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">Recommended Resume Sections</h2>
              </div>
              <div className="space-y-4 mt-6">
                {resumeSectionSuggestions.map((section: ResumeSectionSuggestion) => (
                  <div key={section.title} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                    <h3 className="text-base font-bold text-slate-900">{section.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2">{section.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8 lg:col-span-1">
              <div className="flex items-center gap-2 text-slate-900">
                <Tags className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">Keyword Suggestions</h2>
              </div>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">Naturally incorporate these keywords into your title, project experience, and skill descriptions to better align your {roleRecord.role} resume with job descriptions.</p>
              <div className="flex flex-wrap gap-3 mt-6">
                {keywordSuggestions.map((keyword: string) => (
                  <span key={keyword} className="px-4 py-2 rounded-full bg-violet-50 text-violet-600 text-sm font-medium">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Recommended Templates</h2>
            <p className="text-sm text-slate-500 mt-2">Based on common reading preferences and key highlights for {roleRecord.role} roles, we recommend these templates.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {recommendedTemplates.map((template) => (
                <div key={template.id} className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                  <div className="relative aspect-[3/4] bg-slate-100">
                    <Image
                      src={template.preview}
                      alt={template.name}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <div className="text-lg font-bold text-slate-900">{template.name}</div>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">{template.description}</p>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed">{template.fitReason}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(template.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-full bg-white text-slate-500 text-xs font-medium border border-slate-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Link href={`/editor?template=${template.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 mt-4 hover:text-violet-700 transition-colors">
                      Use This Template
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 text-slate-900">
                <BookOpen className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">Related Articles</h2>
              </div>
              <div className="space-y-4 mt-6">
                {recommendedArticles.map((article) => (
                  <Link key={article.slug} href={`/articles/${article.slug}`} className="block rounded-2xl bg-slate-50 border border-slate-100 p-5 hover:bg-white hover:border-violet-200 transition-all">
                    <h3 className="text-base font-bold text-slate-900 hover:text-violet-600 transition-colors">{article.title}</h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{article.abstract}</p>
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <h2 className="text-2xl font-extrabold text-slate-900">Related Role Templates</h2>
              <div className="flex flex-wrap gap-3 mt-6">
                {relatedRoles.map((role) => (
                  <Link key={role.slug} href={`/templates/${role.slug}`} className="px-4 py-2 rounded-full bg-slate-50 text-slate-600 text-sm hover:bg-violet-50 hover:text-violet-600 transition-colors">
                    {role.role}
                  </Link>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">FAQ</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                  <h3 className="text-base font-bold text-slate-900">{item.question}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mt-3">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
