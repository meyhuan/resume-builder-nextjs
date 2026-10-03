/**
 * Job intention information.
 */
export interface JobIntention {
  /** Desired position. */
  readonly position?: string;
  /** Desired city. */
  readonly city?: string;
  /** Expected salary. */
  readonly salary?: string;
  /** Employment type, e.g. full-time, part-time or internship. */
  readonly type?: string;
  /** Recruitment type, e.g. campus or experienced hiring. */
  readonly recruitmentType?: string;
  /** Expected industry. */
  readonly industry?: string;
  /** Current status. */
  readonly currentStatus?: string;
  /** User-defined custom fields. */
  readonly customFields?: Array<{ label: string; value: string }>;
}
