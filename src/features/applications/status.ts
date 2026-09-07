export const APPLICATION_STATUSES = [
  "DRAFT",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_ACTION_TYPES = [
  "COMPLETE_APPLICATION",
  "FOLLOW_UP",
  "ASSESSMENT",
  "INTERVIEW",
  "DECISION",
] as const;

export type ApplicationActionType = (typeof APPLICATION_ACTION_TYPES)[number];
