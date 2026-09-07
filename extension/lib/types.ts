export interface FieldDescriptor {
  fieldId: string;
  tag: string;
  type: string;
  controlKind?: FieldControlKind;
  context: string;
  optionText: string;
  options: string[];
  section?:
    | "personal"
    | "experiences"
    | "projects"
    | "education"
    | "other-person";
  rowIndex?: number;
  labelSource?: "adapter" | "label" | "nearby" | "attribute";
}

export type FieldControlKind =
  | "native"
  | "readonly-date"
  | "custom-select"
  | "generic-select"
  | "popup-date"
  | "cascader"
  | "unsupported"
  | "year-month";
// Generic ARIA/component selection is separate from the existing Tencent driver.

export interface SiteContextRule {
  selector: string;
  context: string;
  controlKind?: FieldControlKind;
  allowReadOnly?: boolean;
}

export interface SiteRepeaterRule {
  profilePath: "education" | "experiences" | "projects";
  rowSelector: string;
  addButtonSelectors: string[];
  maxRows?: number;
  renderTimeoutMs?: number;
}

export type RepeaterStatus =
  | "complete"
  | "not_needed"
  | "no_profile_rows"
  | "button_not_found"
  | "button_unresponsive"
  | "partial";

export interface RepeaterDiagnostic {
  profilePath: SiteRepeaterRule["profilePath"];
  desired: number;
  initial: number;
  current: number;
  added: number;
  attempts: number;
  status: RepeaterStatus;
  failureReason?: "button_not_found" | "button_unresponsive";
  selectorUsed?: string;
}

export interface RepeaterExecutionSummary {
  addedRows: number;
  diagnostics: RepeaterDiagnostic[];
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
  repeaters?: SiteRepeaterRule[];
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
  recordingError?: string;
  controlMetrics?: Record<string, number>;
  failedCount?: number;
  missingProfileCount?: number;
  unmatchedCount?: number;
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
  repeaterDiagnostics?: RepeaterDiagnostic[];
  detectedFieldCount?: number;
  contextualFieldCount?: number;
}
