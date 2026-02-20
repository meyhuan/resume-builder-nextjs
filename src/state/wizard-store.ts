import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type UserIdentity = 'student' | 'graduate' | 'professional';

export interface WizardState {
  currentStep: number;
  totalSteps: number;
  
  // Step 1: Identity
  identity: UserIdentity | null;
  
  // Step 1.5: Work Years (Only for Professional)
  workYears: string;

  // Step 2: Job Intent
  targetRole: string;
  
  // Step 3: Major
  major: string;
  
  // Step 4: Projects (Multi-select)
  projects: string[];
  
  // Step 4 (Student): Campus Activities
  campusActivities: string[];

  // Step 5: Soft Skills (Multi-select)
  softSkills: string[];
  
  // Step 6: Certificates (Multi-select)
  certificates: string[];
  
  // Step 7: Additional Info
  additionalInfo: string;
  uploadedFiles: File[]; // Note: Files might not persist well in local storage, might need special handling

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  setIdentity: (identity: UserIdentity) => void;
  setWorkYears: (years: string) => void;
  setTargetRole: (role: string) => void;
  setMajor: (major: string) => void;
  toggleProject: (project: string) => void;
  toggleCampusActivity: (activity: string) => void;
  toggleSoftSkill: (skill: string) => void;
  toggleCertificate: (cert: string) => void;
  setAdditionalInfo: (info: string) => void;
  setUploadedFiles: (files: File[]) => void;
  reset: () => void;
}

export const useWizardStore = create<WizardState>()(
  devtools(
    persist(
      (set) => ({
        currentStep: 1,
        totalSteps: 7,
        
        identity: null,
        workYears: '',
        targetRole: '',
        major: '',
        projects: [],
        campusActivities: [],
        softSkills: [],
        certificates: [],
        additionalInfo: '',
        uploadedFiles: [],

        setStep: (step) => set({ currentStep: step }),
        nextStep: () => set((state) => ({ 
          currentStep: Math.min(state.currentStep + 1, state.totalSteps) 
        })),
        prevStep: () => set((state) => ({ 
          currentStep: Math.max(state.currentStep - 1, 1) 
        })),

        setIdentity: (identity) => set({ 
          identity,
          totalSteps: 7
        }),
        setWorkYears: (workYears) => set({ workYears }),
        setTargetRole: (targetRole) => set({ targetRole }),
        setMajor: (major) => set({ major }),
        
        toggleProject: (project) => set((state) => {
          const exists = state.projects.includes(project);
          return {
            projects: exists 
              ? state.projects.filter(p => p !== project)
              : [...state.projects, project]
          };
        }),

        toggleCampusActivity: (activity) => set((state) => {
          const exists = state.campusActivities.includes(activity);
          return {
            campusActivities: exists 
              ? state.campusActivities.filter(a => a !== activity)
              : [...state.campusActivities, activity]
          };
        }),
        
        toggleSoftSkill: (skill) => set((state) => {
          const exists = state.softSkills.includes(skill);
          return {
            softSkills: exists 
              ? state.softSkills.filter(s => s !== skill)
              : [...state.softSkills, skill]
          };
        }),
        
        toggleCertificate: (cert) => set((state) => {
          const exists = state.certificates.includes(cert);
          return {
            certificates: exists 
              ? state.certificates.filter(c => c !== cert)
              : [...state.certificates, cert]
          };
        }),

        setAdditionalInfo: (additionalInfo) => set({ additionalInfo }),
        setUploadedFiles: (files) => set({ uploadedFiles: files }),
          
        reset: () => set({
          currentStep: 1,
          identity: null,
          workYears: '',
          targetRole: '',
          major: '',
          projects: [],
          campusActivities: [],
          softSkills: [],
          certificates: [],
          additionalInfo: '',
          uploadedFiles: []
        })
      }),
      {
        name: 'resume-wizard-storage',
        partialize: (state) => ({
          identity: state.identity,
          workYears: state.workYears,
          targetRole: state.targetRole,
          major: state.major,
          projects: state.projects,
          softSkills: state.softSkills,
          certificates: state.certificates,
          additionalInfo: state.additionalInfo
        }),
      }
    )
  )
);
