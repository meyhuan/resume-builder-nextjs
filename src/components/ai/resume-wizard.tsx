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
      getHistoryContent: (s) => `我是${getIdentityLabel(s.identity)}`,
      isUserHistory: true,
    },
    workYears: {
      component: StepWorkYears,
      getHistoryContent: (s) => `我的工作年限是${s.workYears}`,
      isUserHistory: true,
    },
    targetRole: {
      component: StepTargetRole,
      getHistoryContent: (s) => `我想要找${s.targetRole}方向相关的工作`,
      isUserHistory: true,
    },
    major: {
      component: StepMajor,
      getHistoryContent: (s) => `所学专业是${s.major}`,
      isUserHistory: true,
    },
    projects: {
      component: StepProjects,
      getHistoryContent: (s) =>
        s.projects.length > 0 ? `我参与过${s.projects.join('、')}等项目` : '跳过',
      isUserHistory: true,
    },
    campusActivities: {
      component: StepCampusActivities,
      getHistoryContent: (s) =>
        s.campusActivities.length > 0
          ? `我参加过${s.campusActivities.join('、')}等校园活动`
          : '跳过',
      isUserHistory: true,
    },
    skills: {
      component: StepSkills,
      getHistoryContent: (s) =>
        s.softSkills.length > 0 ? `我具有${s.softSkills.join('、')}的技能` : '跳过',
      isUserHistory: true,
    },
    certificates: {
      component: StepCertificates,
      getHistoryContent: (s) =>
        s.certificates.length > 0
          ? `我获得过${s.certificates.join('、')}的资格证书`
          : '跳过',
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
