import type { ExternalResume } from './external-resume-types'

/**
 * Default new resume initial content (blank template with guide text)
 */
export const BLANK_RESUME_JSON: ExternalResume = {
  base_info: {
    name: 'Your Name',
    gender: 'Gender',
    age: 'Age',
    birthday: '',
    show_age_type: 1,
    phone: 'Phone Number',
    mail: 'Email',
    url: '',
    nation: '',
    hide_avatar: true,
    politics_status: '',
    height: '',
    weight: '',
  },
  experience: [
    {
      id: 'default-exp-1',
      name: 'Company Name',
      category: '',
      industry: 'Industry',
      position: 'Job Title',
      work_place: '',
      month_salary: 'Monthly Salary',
      work_industry: '',
      content: '<p>Describe your responsibilities, work content, and achievements. List the most recent experience first. Keep descriptions concise and relevant to the target role to help recruiters quickly identify your strengths. Use numbers to quantify accomplishments whenever possible, and highlight analytical skills, teamwork, and problem-solving abilities.</p>',
      is_hide: false,
      period: {
        start: 'Start Date',
        end: 'End Date',
      },
    },
  ],
  education: [
    {
      id: 'default-edu-1',
      name: 'School Name',
      major: 'Major',
      degree: 'Degree',
      is_hide: false,
      recruit_type: '',
      course: '<p>List relevant coursework related to your target role. Include exchange/study abroad experience if applicable. If you have extensive work experience, keep education concise. If your grades are strong, include GPA and class ranking.</p>',
      period: {
        start: 'Start Date',
        end: 'End Date',
      },
      content: '',
    },
  ],
  program_experience: [
    {
      id: 'default-proj-1',
      name: 'Project Name',
      role: 'Your Role',
      category: '',
      content: '<p>Describe the projects you contributed to and your role. Keep it concise and highlight aspects relevant to your target position: 1) Project overview; 2) Your responsibilities; 3) Key outcomes and results.</p>',
      is_hide: false,
      period: {
        start: 'Start Date',
        end: 'End Date',
      },
    },
  ],
  self_evaluation: {
    content: '<p>Write a concise professional summary that highlights your experience, strengths, and role fit. Focus on measurable impact, relevant tools, and the value you bring to employers. Avoid generic adjectives and keep the tone ATS-friendly.</p>',
    is_hide: false,
  },
  intern: [],
  school_exps: [],
  skills: {
    content: '',
    is_hide: true,
  },
  qualifications: {
    content: '',
    is_hide: true,
  },
  custom_module_info: [],
}

/**
 * Test data (complete resume example)
 */
export const TEST_RESUME_JSON: ExternalResume = {
  base_info: {
    name: 'John Smith',
    gender: 'Male',
    age: '28',
    birthday: '1996.03.15',
    show_age_type: 1,
    phone: '138****8888',
    mail: 'zhangming@example.com',
    url: '',
    nation: '',
    hide_avatar: true,
    politics_status: '',
    height: '',
    weight: '',
  },
  experience: [
    {
      id: 'test-exp-1',
      name: 'Tech Internet Corp',
      category: '',
      industry: 'Internet',
      position: 'Frontend Developer',
      work_place: '',
      month_salary: '',
      work_industry: '',
      content: '<ul><li>Led frontend development of core products using React, TypeScript, and modern tooling</li><li>Designed project architecture and built component library, improving dev efficiency by 20%</li><li>Optimized page performance via code splitting and lazy loading, reducing initial load time by 40%</li><li>Collaborated closely with product and design teams to deliver projects on time and to spec</li></ul>',
      is_hide: false,
      period: {
        start: '2022.07',
        end: 'Present',
      },
    },
    {
      id: 'test-exp-2',
      name: 'Software Dev Inc',
      category: '',
      industry: 'Software',
      position: 'Frontend Engineer',
      work_place: '',
      month_salary: '',
      work_industry: '',
      content: '<ul><li>Developed and maintained enterprise management system frontend</li><li>Built multiple business modules using Vue.js framework</li><li>Participated in code reviews to ensure code quality and standards</li><li>Mentored new team members on project workflows and tech stack</li></ul>',
      is_hide: false,
      period: {
        start: '2020.07',
        end: '2022.06',
      },
    },
  ],
  intern: [
    {
      id: 'test-intern-1',
      name: 'Internet Tech Co',
      category: '',
      industry: 'Internet',
      position: 'Frontend Intern',
      work_place: '',
      month_salary: '',
      work_industry: '',
      content: '<ul><li>Built frontend pages using React framework and component-based development</li><li>Assisted with mobile H5 page responsive adaptation</li><li>Learned and practiced frontend engineering and performance optimization</li><li>Participated in team code reviews to improve code quality</li></ul>',
      is_hide: false,
      period: {
        start: '2019.07',
        end: '2020.01',
      },
    },
  ],
  education: [
    {
      id: 'test-edu-1',
      name: 'Stanford University',
      major: 'Computer Science',
      degree: 'Bachelor',
      is_hide: false,
      recruit_type: '',
      course: '<p>Relevant coursework: Data Structures & Algorithms, Computer Networks, Database Systems, Software Engineering, Web Development. GPA 3.6/4.0, Dean\'s List scholarship recipient.</p>',
      period: {
        start: '2016.09',
        end: '2020.06',
      },
      content: '',
    },
  ],
  program_experience: [
    {
      id: 'test-proj-1',
      name: 'Enterprise Admin Dashboard',
      role: 'Frontend Lead',
      category: '',
      content: '<p><strong>Overview:</strong> A comprehensive enterprise admin system with user management, role-based access control, and data analytics modules.</p><p><strong>Responsibilities:</strong></p><ul><li>Designed frontend architecture using React + TypeScript + Ant Design</li><li>Built reusable component library, improving development efficiency by 30%</li><li>Developed permission management and routing control modules</li><li>Optimized rendering performance for large datasets via virtual lists and lazy loading</li></ul>',
      is_hide: false,
      period: {
        start: '2022.07',
        end: 'Present',
      },
    },
    {
      id: 'test-proj-2',
      name: 'E-commerce Mobile App',
      role: 'Frontend Developer',
      category: '',
      content: '<p><strong>Overview:</strong> Built a mobile e-commerce platform with product catalog, shopping cart, and order management features.</p><p><strong>Responsibilities:</strong></p><ul><li>Developed pages and interaction logic using React Native</li><li>Integrated payment gateway and completed order flow development</li><li>Optimized app loading performance, reducing initial load time by 50%</li><li>Handled edge cases and error states to improve user experience</li></ul>',
      is_hide: false,
      period: {
        start: '2021.03',
        end: '2021.12',
      },
    },
  ],
  school_exps: [
    {
      id: 'test-campus-1',
      name: 'Student Tech Association',
      position: 'President',
      content: '<ul><li>Organized tech talks and coding workshops, improving peers\' technical skills</li><li>Planned and hosted a campus web dev competition with nearly 100 participants</li><li>Led team to develop a campus information portal serving all students and faculty</li><li>Coordinated various departmental events and activities</li></ul>',
      is_hide: false,
      period: {
        start: '2018.09',
        end: '2020.06',
      },
    },
  ],
  self_evaluation: {
    content: '<p>5 years of frontend development experience. Proficient in React, Vue, and modern frameworks with a solid JavaScript/TypeScript foundation. Experienced in frontend engineering and performance optimization with extensive hands-on project experience. Strong communication, teamwork, and learning abilities. Capable of independently leading frontend architecture design and development. Passionate about technology, staying up-to-date with frontend trends, and sharing knowledge with the team.</p>',
    is_hide: false,
  },
  skills: {
    content: '<ul><li>Expert in JavaScript/TypeScript with proficient use of ES6+ features</li><li>Proficient in React, Vue, and other major frontend frameworks, with deep understanding of internals and best practices</li><li>Experienced in frontend engineering with Webpack, Vite, and build tool optimization</li><li>Skilled in HTML5, CSS3, capable of implementing complex layouts and animations</li><li>Familiar with Node.js for basic backend development and API integration</li><li>Strong knowledge of design patterns, data structures, and algorithms</li><li>Proficient with Git version control, following good coding standards and documentation practices</li><li>Experienced in frontend performance optimization including SSR, lazy loading, and code splitting</li></ul>',
    is_hide: false,
  },
  qualifications: {
    content: '<p>AWS Certified Developer, Google Analytics Certification, PMP Certification</p>',
    is_hide: false,
  },
  custom_module_info: [
    {
      name: 'Custom Section',
      content: '<p>This is custom section content</p>',
      is_hide: false,
      module_name: 'custom_module_0101fef91e47bc1e3f1d2e48d512bbf6',
    },
  ],
}
