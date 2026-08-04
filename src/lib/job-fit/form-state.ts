import type { JobFitFocusArea, JobFitOptimizationMode } from "./types";

const DEFAULT_FOCUS_AREAS: readonly JobFitFocusArea[] = [
  "keywords",
  "achievements",
  "concise",
];

const FOCUS_AREAS = new Set<JobFitFocusArea>([
  ...DEFAULT_FOCUS_AREAS,
  "structure",
]);

export interface JobFitFormTaskSnapshot {
  readonly id: string;
  readonly sourceType: "EXISTING" | "FILE" | "TEXT";
  readonly sourceResumeId: string | null;
  readonly companyName: string | null;
  readonly jobTitle: string | null;
  readonly jobDescription: string | null;
  readonly jobUrl: string | null;
  readonly focusAreas: unknown;
  readonly optimizationMode?: JobFitOptimizationMode;
}

export interface JobFitFormInitialValues {
  readonly restoredFromTaskId: string;
  readonly sourceType: "EXISTING" | "FILE" | "TEXT";
  readonly resumeId: string;
  readonly companyName: string;
  readonly jobTitle: string;
  readonly jobDescription: string;
  readonly jobUrl: string;
  readonly focusAreas: readonly JobFitFocusArea[];
  readonly optimizationMode: JobFitOptimizationMode;
}

export function buildJobFitFormInitialValues(
  task: JobFitFormTaskSnapshot,
  availableResumeIds: ReadonlySet<string>,
): JobFitFormInitialValues {
  const canReuseParsedResume = Boolean(
    task.sourceResumeId && availableResumeIds.has(task.sourceResumeId),
  );

  return {
    restoredFromTaskId: task.id,
    sourceType: canReuseParsedResume ? "EXISTING" : task.sourceType,
    resumeId: canReuseParsedResume ? (task.sourceResumeId ?? "") : "",
    companyName: task.companyName ?? "",
    jobTitle: task.jobTitle ?? "",
    jobDescription: task.jobDescription ?? "",
    jobUrl: task.jobUrl ?? "",
    focusAreas: parseFocusAreas(task.focusAreas),
    optimizationMode: task.optimizationMode === "SPRINT" ? "SPRINT" : "PROFESSIONAL",
  };
}

function parseFocusAreas(value: unknown): readonly JobFitFocusArea[] {
  if (!Array.isArray(value)) return DEFAULT_FOCUS_AREAS;
  const parsed = value.filter(
    (item): item is JobFitFocusArea =>
      typeof item === "string" && FOCUS_AREAS.has(item as JobFitFocusArea),
  );
  return parsed.length > 0 ? parsed : DEFAULT_FOCUS_AREAS;
}
