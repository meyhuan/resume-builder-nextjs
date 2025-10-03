/**
 * ExperienceItem represents a single work experience entry.
 */
export interface ExperienceItem {
  readonly id: string
  readonly company: string
  readonly position: string
  readonly industry?: string
  readonly startDate: string
  readonly endDate: string
  /** HTML content for job responsibilities. */
  readonly contentHtml: string
}
