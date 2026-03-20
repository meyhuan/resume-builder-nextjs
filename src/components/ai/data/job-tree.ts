/**
 * Categorized job tree data derived from job_tree.json.
 * Each category maps to a flat array of unique job titles.
 */

export interface JobCategory {
  name: string;
  jobs: string[];
}

const JOB_TREE: JobCategory[] = [
  {
    name: 'Internet & Communications',
    jobs: [
      'Product Assistant', 'Product Planner', 'Product Manager', 'Game Planner',
      'DBA', 'Frontend Developer', 'Backend Developer', 'QA Engineer', 'Hardware Developer', 'Mobile Developer', 'Network Transport', 'DevOps Engineer',
      'UI/UX Designer', 'Graphic Designer', 'Game Concept Artist', 'Game Environment Artist', 'Game VFX Designer', 'Web Designer',
      'Product Operations', 'Content Operations', 'Customer Service', 'Social Media Operations', 'Campaign Operations', 'User Operations',
    ],
  },
  {
    name: 'Public Services',
    jobs: [
      'State-Owned Enterprise Staff', 'Police Officer', 'Public Institution Staff', 'Civil Servant',
      'Agronomist', 'Animal Breeding Specialist', 'Horticulturist', 'Livestock Specialist', 'Animal Caretaker', 'Feed R&D Specialist',
      'University Professor', 'Researcher', 'Volunteer',
    ],
  },
  {
    name: 'PR / Media / Marketing',
    jobs: ['Brand PR', 'Business Development', 'Market Research', 'Marketing Promotion', 'Sales Representative'],
  },
  {
    name: 'Healthcare & Pharmaceuticals',
    jobs: [
      'Chemical Analyst', 'Pharmaceutical Sales Representative', 'Pharma Business Development', 'Drug Registration Specialist', 'Drug R&D Specialist',
      'Medical Device R&D Specialist', 'Medical Device Technician', 'Medical Device Buyer', 'Medical Device Sales', 'Quality Manager',
      'Traditional Chinese Medicine Doctor', 'Veterinarian', 'Internal Medicine Doctor', 'Surgeon', 'Psychologist', 'Nurse',
      'Radiologist', 'Lab Technician', 'Physical Therapist', 'Pharmacist', 'Anesthesiologist',
    ],
  },
  {
    name: 'Advertising / Media / Design',
    jobs: [
      'Host', 'Agent', 'Editor-in-Chief', 'Publishing & Distribution', 'Editor', 'Art Editor', 'Journalist',
      'Event Planner', 'Ad Optimization Specialist', 'Advertising Executive', 'Advertising Designer', 'Advertising Sales', 'Copywriter',
      'Post-Production Specialist', 'Director', 'Assistant Director', 'Film & Video Producer', 'Photographer', 'Screenwriter/Director', 'Art Director',
    ],
  },
  {
    name: 'Real Estate / Construction',
    jobs: [
      'Construction Supervisor', 'Architectural Engineer', 'Surveying Engineer', 'Site Manager', 'Plumbing Engineer',
      'Installation Technician', 'Foreman', 'Carpenter', 'Electrician', 'Painter',
      'Contract Manager', 'Real Estate Agent', 'Property Broker', 'Investment Analyst', 'Asset Manager',
      'Tendering Specialist', 'Project Planner', 'Project Manager',
      'Security Guard', 'Cleaner', 'Customer Service Consultant', 'MEP Manager', 'Property Leasing Specialist', 'Property Manager', 'Property Maintenance Technician', 'Landscaping Specialist', 'Facilities Manager',
      'Urban Planner', 'Interior Designer', 'Curtain Wall Designer', 'Landscape Designer', 'Hard Finish Designer', 'Structural Designer', 'Soft Furnishing Designer',
    ],
  },
  {
    name: 'Education / Consulting / Translation',
    jobs: [
      'Corporate Trainer', 'Psychological Counselor', 'Research Analyst', 'Financial Consultant',
      'Academic Affairs Assistant', 'Curriculum Designer', 'Course Consultant',
      'Chemistry Teacher', 'History Teacher', 'Tutor', 'Kindergarten Teacher', 'Politics Teacher',
      'Math Teacher', 'Physics Teacher', 'Dance Teacher', 'English Teacher', 'Chinese Teacher', 'Music Teacher',
    ],
  },
  {
    name: 'Mechanical / Energy / Automotive',
    jobs: [
      'Process Engineer', 'Materials Engineer', 'Formula Engineer',
      'Mechanical Engineer', 'Mechatronics Engineer', 'Mold Design Engineer', 'Hydraulic Engineer', 'Welding Engineer',
      'Structural Engineer', 'Drafting Engineer', 'Automation Engineer',
      'Used Car Appraiser', 'Power Engineer', 'Chassis Engineer', 'Final Assembly Engineer', 'Mechanical Designer', 'Auto Detailer', 'Automotive Sales',
      'Geological Exploration Specialist', 'Geological Engineer', 'Hydraulic Engineer', 'Thermal Engineer', 'Gas Technology Specialist',
      'Electrical Engineer', 'Pipeline Designer', 'Control Systems Engineer', 'Mining Specialist', 'Drilling Engineer',
    ],
  },
  {
    name: 'Legal',
    jobs: ['Legal Consultant', 'Compliance Specialist', 'Lawyer', 'Legal Counsel', 'Legal Advisor', 'Intellectual Property Specialist'],
  },
  {
    name: 'Lifestyle / Leisure Services',
    jobs: [
      'Sports Coach', 'Fitness Coach', 'Fitness Consultant', 'Sports Event Planner',
      'Tour Guide', 'Travel Consultant', 'Ticketing Specialist', 'Route Planner', 'Tour Coordinator',
      'Wedding Planner', 'Switchboard Operator', 'Lobby Manager',
    ],
  },
  {
    name: 'Management / HR / Administration',
    jobs: [
      'HRBP', 'HR Specialist', 'Corporate Culture Specialist', 'Training Specialist', 'Recruiter', 'Headhunter', 'Performance Management Specialist', 'Compensation & Benefits Specialist',
      'Receptionist', 'Executive Assistant', 'Administrative Clerk', 'Secretary', 'Administrator',
    ],
  },
  {
    name: 'Finance / Audit / Tax',
    jobs: ['Accountant', 'Cashier', 'Auditor', 'Cost Manager', 'Tax Specialist', 'Finance Specialist'],
  },
  {
    name: 'Procurement / Trade / Logistics',
    jobs: [
      'Product Specialist', 'Supply Chain Specialist', 'R&D Specialist', 'Quality Inspector', 'Buyer',
      'Warehouse Manager', 'Courier', 'Logistics Manager', 'Merchandise Handler', 'Order Processing Specialist', 'Freight Forwarder', 'Container Operations Specialist',
      'Buyer', 'Merchandiser',
      'Train Conductor', 'Ground Staff', 'Customs Affairs Specialist', 'Taxi Driver', 'Dispatcher',
    ],
  },
  {
    name: 'Finance & Investment',
    jobs: [
      'Sales Representative', 'Product R&D Specialist', 'Financial Planner', 'Universal Teller', 'Risk Control Specialist',
      'Trust Manager', 'Account Manager', 'Futures Broker', 'Asset Securitization Specialist',
      'Trader', 'Bond Issuance Specialist', 'Fund Accountant', 'Fund Manager', 'Investment Advisor', 'Industry Research Analyst', 'Securities Analyst',
      'Branch Manager', 'Bank Teller',
    ],
  },
];

/**
 * Returns the full categorized job tree.
 */
export function getJobTree(): readonly JobCategory[] {
  return JOB_TREE;
}

/**
 * Returns a flat, deduplicated list of all job titles.
 */
export function getAllJobs(): string[] {
  const set = new Set<string>();
  for (const cat of JOB_TREE) {
    for (const job of cat.jobs) {
      set.add(job);
    }
  }
  return Array.from(set);
}

/**
 * Searches all jobs across categories by keyword.
 */
export function searchJobs(keyword: string): string[] {
  if (!keyword.trim()) return [];
  const kw = keyword.trim().toLowerCase();
  const result: string[] = [];
  const seen = new Set<string>();
  for (const cat of JOB_TREE) {
    for (const job of cat.jobs) {
      if (!seen.has(job) && job.toLowerCase().includes(kw)) {
        result.push(job);
        seen.add(job);
      }
    }
  }
  return result;
}
