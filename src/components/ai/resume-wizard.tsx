'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useWizardStore, UserIdentity, WizardState } from '@/state/wizard-store';
import { WizardLayout, ChatBubble } from './wizard-layout';
import { StepIdentity } from './steps/step-identity';
import { StepWorkYears } from './steps/step-work-years';
import { StepTargetRole } from './steps/step-target-role';
import { StepMajor } from './steps/step-major';
import { StepProjects } from './steps/step-projects';
import { StepCampusActivities } from './steps/step-campus-activities';
import { StepSkills } from './steps/step-skills';
import { StepCertificates } from './steps/step-certificates';
import { StepAdditionalInfo } from './steps/step-additional-info';
import { IDENTITY_OPTIONS } from './constants';

type StepComponent = React.ComponentType<{ stepNumber: number; onClickPast?: () => void }>;

interface WizardStepConfig {
  component: StepComponent;
  getHistoryContent: (store: WizardState) => string;
  isUserHistory: boolean;
}

const getStepsForIdentity = (identity: UserIdentity | null): string[] => {
  if (!identity) return ['identity'];
  switch (identity) {
    case 'student':
      return ['identity', 'major', 'targetRole', 'campusActivities', 'skills', 'certificates', 'additionalInfo'];
    case 'graduate':
      return ['identity', 'targetRole', 'major', 'projects', 'skills', 'certificates', 'additionalInfo'];
    case 'professional':
      return ['identity', 'workYears', 'targetRole', 'major', 'skills', 'certificates', 'additionalInfo'];
    default:
      return ['identity', 'targetRole', 'major', 'projects', 'skills', 'certificates', 'additionalInfo'];
  }
};

export const ResumeWizard = () => {
  const store = useWizardStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [store.currentStep]);

  const getIdentityLabel = (id: UserIdentity | null): string => {
    return IDENTITY_OPTIONS.find((opt) => opt.id === id)?.label || id || '';
  };

  const currentSteps: string[] = getStepsForIdentity(store.identity);

  const handleResetToStep = useCallback(
    (stepNum: number): void => {
      store.resetFromStep(stepNum, currentSteps);
    },
    [store, currentSteps],
  );

  const STEPS: Record<string, WizardStepConfig> = {
    identity: {
      component: StepIdentity,
      getHistoryContent: (s) => `I am a ${getIdentityLabel(s.identity)}`,
      isUserHistory: true,
    },
    workYears: {
      component: StepWorkYears,
      getHistoryContent: (s) => `My experience level: ${s.workYears}`,
      isUserHistory: true,
    },
    targetRole: {
      component: StepTargetRole,
      getHistoryContent: (s) => `I'm looking for a role in ${s.targetRole}`,
      isUserHistory: true,
    },
    major: {
      component: StepMajor,
      getHistoryContent: (s) => `My major is ${s.major}`,
      isUserHistory: true,
    },
    projects: {
      component: StepProjects,
      getHistoryContent: (s) =>
        s.projects.length > 0 ? `I've worked on: ${s.projects.join(', ')}` : 'Skipped',
      isUserHistory: true,
    },
    campusActivities: {
      component: StepCampusActivities,
      getHistoryContent: (s) =>
        s.campusActivities.length > 0
          ? `I've been involved in: ${s.campusActivities.join(', ')}`
          : 'Skipped',
      isUserHistory: true,
    },
    skills: {
      component: StepSkills,
      getHistoryContent: (s) =>
        s.softSkills.length > 0 ? `My skills: ${s.softSkills.join(', ')}` : 'Skipped',
      isUserHistory: true,
    },
    certificates: {
      component: StepCertificates,
      getHistoryContent: (s) =>
        s.certificates.length > 0
          ? `My certifications: ${s.certificates.join(', ')}`
          : 'Skipped',
      isUserHistory: true,
    },
    additionalInfo: {
      component: StepAdditionalInfo,
      getHistoryContent: () => '',
      isUserHistory: true,
    },
  };

  const renderHistory = (): React.ReactNode[] => {
    const historyComponents: React.ReactNode[] = [];

    for (let i = 0; i < currentSteps.length; i++) {
      const stepKey = currentSteps[i];
      const stepNum = i + 1;
      const config = STEPS[stepKey];
      if (!config) continue;
      const StepComp = config.component;

      if (store.currentStep > stepNum) {
        historyComponents.push(
          <React.Fragment key={`${stepKey}-history`}>
            <StepComp
              stepNumber={stepNum}
              onClickPast={() => handleResetToStep(stepNum)}
            />
            <ChatBubble
              isUser={config.isUserHistory}
              content={config.getHistoryContent(store)}
            />
          </React.Fragment>,
        );
      } else if (store.currentStep === stepNum) {
        historyComponents.push(
          <StepComp key={`${stepKey}-active`} stepNumber={stepNum} />,
        );
        break;
      }
    }
    return historyComponents;
  };

  return (
    <WizardLayout>
      {renderHistory()}
      <div ref={bottomRef} className="h-4" />
    </WizardLayout>
  );
};
