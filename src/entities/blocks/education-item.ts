/**
 * EducationItem represents a single education entry.
 */
export interface EducationItem {
  readonly id: string
  readonly school: string
  readonly major?: string
  readonly degree?: string
  readonly startDate: string
  readonly endDate: string
  /** HTML for courses or achievements. */
  readonly courseHtml?: string
}
