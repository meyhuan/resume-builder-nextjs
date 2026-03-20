type EmergingTemplateRole = {
  role: string;
  industry: string;
  category: string;
};

export const emergingTemplateRoles: readonly EmergingTemplateRole[] = [
  { role: 'AI Product Manager', industry: 'Tech & Internet', category: 'Product' },
  { role: 'Data Product Manager', industry: 'Tech & Internet', category: 'Product' },
  { role: 'B2B Product Manager', industry: 'Tech & Internet', category: 'Product' },
  { role: 'Growth Product Manager', industry: 'Tech & Internet', category: 'Product' },
  { role: 'AIGC Operations', industry: 'Tech & Internet', category: 'Operations' },
  { role: 'Growth Operations', industry: 'Tech & Internet', category: 'Operations' },
  { role: 'Community Manager', industry: 'Tech & Internet', category: 'Operations' },
  { role: 'Social Media Manager', industry: 'Tech & Internet', category: 'Operations' },
  { role: 'Short Video Operations', industry: 'Tech & Internet', category: 'Operations' },
  { role: 'Livestream Operations', industry: 'Tech & Internet', category: 'Operations' },
  { role: 'Influencer Manager', industry: 'Tech & Internet', category: 'Operations' },
  { role: 'E-commerce Operations', industry: 'Tech & Internet', category: 'Operations' },
  { role: 'Cross-border E-commerce', industry: 'Tech & Internet', category: 'Operations' },
  { role: 'Data Operations', industry: 'Tech & Internet', category: 'Operations' },
  { role: 'Prompt Engineer', industry: 'Tech & Internet', category: 'Engineering' },
  { role: 'LLM Application Engineer', industry: 'Tech & Internet', category: 'Engineering' },
  { role: 'Algorithm Engineer', industry: 'Tech & Internet', category: 'Engineering' },
  { role: 'Machine Learning Engineer', industry: 'Tech & Internet', category: 'Engineering' },
  { role: 'Data Analyst', industry: 'Tech & Internet', category: 'Engineering' },
  { role: 'Business Analyst', industry: 'Tech & Internet', category: 'Engineering' },
  { role: 'UX Designer', industry: 'Advertising & Design', category: 'Design' },
  { role: 'Experience Designer', industry: 'Advertising & Design', category: 'Design' },
  { role: 'Motion Designer', industry: 'Advertising & Design', category: 'Design' },
  { role: 'Visual Designer', industry: 'Advertising & Design', category: 'Design' },
  { role: 'Brand Designer', industry: 'Advertising & Design', category: 'Design' },
  { role: 'E-commerce Designer', industry: 'Advertising & Design', category: 'Design' },
  { role: 'User Researcher', industry: 'Advertising & Design', category: 'Design' },
  { role: 'Customer Success Manager', industry: 'Management & HR', category: 'HR' },
  { role: 'Implementation Consultant', industry: 'Education & Consulting', category: 'Consulting' },
  { role: 'Solutions Consultant', industry: 'Education & Consulting', category: 'Consulting' },
  { role: 'Pre-sales Consultant', industry: 'Education & Consulting', category: 'Consulting' },
  { role: 'Delivery Manager', industry: 'Management & HR', category: 'HR' },
] as const;
