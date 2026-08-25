export interface FieldDescriptor {
  fieldId: string;
  tag: string;
  type: string;
  context: string;
  optionText: string;
  options: string[];
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
}

export interface ApplicationProfileEnvelope {
  profile: Record<string, unknown>;
  defaultResumeId: string | null;
  updatedAt: string;
}

export interface FillResult {
  filled: number;
  skipped: number;
  unmatched: string[];
  applicationId?: string;
  job?: JobInfo;
}
