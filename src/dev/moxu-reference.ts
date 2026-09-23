import type { ResumeData } from "@/entities/resume/resume-data";

/** Reference content for visual QA; never injected into a user's resume. */
export const moxuReferenceResume: ResumeData = {
  id: "scenario-moxu-reference",
  name: "Kate Zhang",
  language: "en",
  baseInfo: {
    title: "Financial Analyst",
    phone: "001-12345678",
    email: "cnsupport@canva.com",
    showAvatar: false,
  },
  jobIntention: { position: "Financial Analyst" },
  jobIntentionVisible: true,
  sections: [
    {
      id: "mx-objective",
      title: "Objective",
      columns: 1,
      blocks: [
        {
          id: "mx-summary",
          type: "text",
          html: "<p>Highly motivated and results-driven finance professional with 4+ years of experience in investment analysis, financial modeling, and risk management. I am seeking a challenging role as a Financial Analyst at a reputable investment bank where I can leverage my analytical skills and contribute to strategic decision-making.</p>",
        },
      ],
    },
    {
      id: "mx-education",
      title: "Education",
      columns: 1,
      blocks: [
        {
          id: "mx-edu",
          type: "education",
          school: "University Name",
          major: "Bachelor of Science in Finance",
          startDate: "2014.09",
          endDate: "2018.05",
          courseHtml:
            "<p>Relevant Coursework: Corporate Finance, Financial Statement Analysis, Investment Strategies, Econometrics</p>",
        },
      ],
    },
    {
      id: "mx-experience",
      title: "Professional Experience",
      columns: 1,
      blocks: [
        {
          id: "mx-job",
          type: "experience",
          company: "Company Name",
          position: "Financial Analyst",
          startDate: "2018.06",
          endDate: "Present",
          contentHtml:
            "<ol><li>Conducted in-depth financial analysis and created detailed financial models to evaluate investment opportunities, resulting in the successful recommendation of 15+ high-yield investments.</li><li>Perform market research and competitor analysis to inform strategic investment decisions, contributing to a 20% increase in portfolio performance over two years.</li><li>Develop and maintain complex financial models using Excel and Bloomberg Terminal, streamlining reporting processes and reducing analysis time by 30%.</li><li>Collaborate with cross-functional teams, including risk management and investment banking, to assess potential risks and opportunities for mergers and acquisitions.</li></ol>",
        },
        {
          id: "mx-intern",
          type: "experience",
          company: "Company Name",
          position: "Intern",
          startDate: "2017.06",
          endDate: "2017.08",
          contentHtml:
            "<ol><li>I assisted in preparing pitch books and financial models for M&amp;A deals, gaining hands-on experience in deal structuring and valuation.</li><li>Conducted industry research and compiled market data to support client presentations, enhancing understanding of various sectors and market trends.</li><li>Participated in due diligence processes, analyzing financial statements and identifying key value drivers and risk factors.</li></ol>",
        },
      ],
    },
    {
      id: "mx-skills",
      title: "Skills",
      columns: 1,
      blocks: [
        {
          id: "mx-skill-text",
          type: "text",
          html: "<ul><li>Advanced Excel and financial modeling expertise.</li><li>Proficient in Bloomberg Terminal, FactSet, and Thomson Reuters Eikon.</li><li>Strong understanding of financial markets, investment strategies, and risk management frameworks.</li><li>Effective communicator with the ability to distill complex financial concepts into actionable insights.</li><li>Team player with a proactive approach to learning and adapting to new challenges.</li></ul>",
        },
      ],
    },
    {
      id: "mx-certifications",
      title: "Certifications",
      columns: 1,
      blocks: [
        {
          id: "mx-cert-text",
          type: "text",
          html: "<ul><li>Chartered Financial Analyst (CFA), Level III Candidate</li><li>Certified FRM (Financial Risk Manager)</li></ul>",
        },
      ],
    },
    {
      id: "mx-languages",
      title: "Languages",
      columns: 1,
      blocks: [
        {
          id: "mx-lang-text",
          type: "text",
          html: "<p>Chinese (Native), English (Fluent)</p>",
        },
      ],
    },
  ],
};
