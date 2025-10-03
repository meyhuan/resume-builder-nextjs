/**
 * ProjectItem represents a single project experience entry.
 */
export interface ProjectItem {
  readonly id: string
  readonly name: string
  readonly role?: string
  readonly startDate: string
  readonly endDate: string
  /** HTML for project description and responsibilities. */
  readonly contentHtml: string
}
