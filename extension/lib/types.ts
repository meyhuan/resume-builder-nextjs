export interface FieldDescriptor {
  fieldId: string;
  tag: string;
  type: string;
  controlKind?: FieldControlKind;
  context: string;
  optionText: string;
  options: string[];
}

export type FieldControlKind =
  | "native"
  | "readonly-date"
  | "custom-select"
  | "year-month";

export interface SiteContextRule {
  selector: string;
  context: string;
  controlKind?: FieldControlKind;
  allowReadOnly?: boolean;
}

export interface SiteRepeaterRule {
  profilePath: "education" | "experiences" | "projects";
  rowSelector: string;
  addButtonSelector: string;
  maxRows?: number;
}

export interface SiteAdapter {
  id: string;
  rootSelector?: string;
  ignoreSelectors: string[];
  contextRules: SiteContextRule[];
  repeaters?: SiteRepeaterRule[];
}

export interface JobInfo {
  companyName: string;
  jobTitle: string;
  location: string;
  jobUrl: string;
  applicationUrl: string;
  sourceDomain: string;
}

export interface PageSnapshot {
  fields: FieldDescriptor[];
  job: JobInfo;
}
export interface FillAction {
  fieldId: string;
  value: string;
  context?: string;
  controlKind?: FieldControlKind;
}

export interface ApplicationProfileEnvelope {
  profile: Record<string, unknown>;
  defaultResumeId: string | null;
  updatedAt: string;
}

export interface FillResult {
  filled: number;
  skipped: number;
  alreadyFilled: number;
  failed: string[];
  missingProfile: string[];
  unmatched: string[];
  applicationId?: string;
  job?: JobInfo;
  profileExperienceCount?: number;
  pageExperienceCount?: number;
  addedExperienceRows?: number;
}
