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
  /** Job type. */
  readonly type?: string;
  /** Expected industry. */
  readonly industry?: string;
  /** Current status. */
  readonly currentStatus?: string;
  /** User-defined custom fields. */
  readonly customFields?: Array<{ label: string; value: string }>;
}
