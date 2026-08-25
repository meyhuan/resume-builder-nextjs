import { z } from "zod";

const shortText = z.string().trim().max(300).default("");
const longText = z.string().trim().max(20_000).default("");

export const educationSchema = z.object({
  id: shortText,
  school: shortText,
  major: shortText,
  degree: shortText,
  startDate: shortText,
  endDate: shortText,
  educationType: shortText,
  gpa: shortText,
  rank: shortText,
  courses: longText,
  description: longText,
});

export const experienceSchema = z.object({
  id: shortText,
  type: z.enum(["work", "intern"]).default("intern"),
  company: shortText,
  position: shortText,
  industry: shortText,
  location: shortText,
  startDate: shortText,
  endDate: shortText,
  description: longText,
});

export const projectSchema = z.object({
  id: shortText,
  name: shortText,
  role: shortText,
  startDate: shortText,
  endDate: shortText,
  description: longText,
});

export const campusSchema = z.object({
  id: shortText,
  organization: shortText,
  position: shortText,
  startDate: shortText,
  endDate: shortText,
  description: longText,
});

export const applicationProfilePayloadSchema = z.object({
  version: z.literal(1).default(1),
  personal: z.object({
    fullName: shortText,
    englishName: shortText,
    gender: shortText,
    birthDate: shortText,
    maritalStatus: shortText,
    healthStatus: shortText,
    height: shortText,
    weight: shortText,
    photoUrl: z.string().trim().max(2_000).default(""),
  }),
  contact: z.object({
    phone: shortText,
    alternatePhone: shortText,
    email: shortText,
    alternateEmail: shortText,
    currentCity: shortText,
    hometown: shortText,
    householdRegistration: shortText,
    address: shortText,
  }),
  identity: z.object({
    idType: shortText,
    idNumber: shortText,
    nationality: shortText,
    ethnicity: shortText,
    politicalStatus: shortText,
  }),
  jobPreference: z.object({
    targetRole: shortText,
    targetCity: shortText,
    employmentType: shortText,
    expectedSalary: shortText,
    availableDate: shortText,
    acceptAdjustment: shortText,
  }),
  education: z.array(educationSchema).max(20).default([]),
  experiences: z.array(experienceSchema).max(30).default([]),
  projects: z.array(projectSchema).max(30).default([]),
  campus: z.array(campusSchema).max(30).default([]),
  abilities: z.object({
    skills: longText,
    certificates: longText,
    languages: longText,
    selfEvaluation: longText,
  }),
  links: z.object({
    personalWebsite: shortText,
    github: shortText,
    portfolio: shortText,
    linkedin: shortText,
  }),
  emergencyContact: z.object({
    name: shortText,
    relationship: shortText,
    phone: shortText,
  }),
  familyMembers: z
    .array(
      z.object({
        id: shortText,
        name: shortText,
        relationship: shortText,
        employer: shortText,
        position: shortText,
        phone: shortText,
      }),
    )
    .max(20)
    .default([]),
  commonAnswers: z
    .array(
      z.object({
        id: shortText,
        question: shortText,
        keywords: z.array(shortText).max(20).default([]),
        answer: longText,
      }),
    )
    .max(100)
    .default([]),
});

export type ApplicationProfilePayload = z.infer<
  typeof applicationProfilePayloadSchema
>;
export type ApplicationEducation = z.infer<typeof educationSchema>;
export type ApplicationExperience = z.infer<typeof experienceSchema>;

export function createEmptyApplicationProfile(): ApplicationProfilePayload {
  return applicationProfilePayloadSchema.parse({
    version: 1,
    personal: {},
    contact: {},
    identity: {},
    jobPreference: {},
    education: [],
    experiences: [],
    projects: [],
    campus: [],
    abilities: {},
    links: {},
    emergencyContact: {},
    familyMembers: [],
    commonAnswers: [],
  });
}
