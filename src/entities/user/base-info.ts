/**
 * Base information displayed at the top of the resume.
 */
export interface BaseInfo {
  /** Avatar image URL (optional). */
  readonly avatarUrl?: string;
  /** Subtitle or desired position. */
  readonly title?: string;
  /** Phone number. */
  readonly phone?: string;
  /** Email address. */
  readonly email?: string;
  /** Gender text (e.g., 男/女). */
  readonly gender?: string;
  /** Age in years. */
  readonly age?: number;
  /** Location/City (optional). */
  readonly location?: string;
  /** Nation/Ethnicity. */
  readonly nation?: string;
  /** Household registration. */
  readonly household?: string;
  /** Current location. */
  readonly currentLocation?: string;
  /** Work start time. */
  readonly workStartTime?: string;
  /** Political status. */
  readonly politicalStatus?: string;
  /** Height in cm. */
  readonly height?: string;
  /** Weight in kg. */
  readonly weight?: string;
}
