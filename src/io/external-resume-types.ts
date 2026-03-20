/**
 * External resume JSON structure (from upstream API).
 */

export interface ExternalPeriod {
  readonly start: string;
  readonly end: string;
}

export interface ExternalBaseInfo {
  readonly name: string;
  readonly gender?: string;
  readonly age?: string;
  readonly birthday?: string;
  readonly show_age_type?: number;
  readonly phone?: string;
  readonly mail?: string;
  readonly url?: string;
  readonly nation?: string;
  readonly hide_avatar?: boolean;
  readonly politics_status?: string;
  readonly height?: string;
  readonly weight?: string;
}

export interface ExternalJobIntention {
  readonly objective?: string;
  readonly category?: string;
  readonly industry?: string;
  readonly curr_salary?: string;
  readonly workyear_age?: string;
  readonly location?: string;
  readonly home_location?: string;
  readonly current_state?: string;
  readonly hope?: string;
  readonly hope_industry?: string;
  readonly city?: string;
  readonly type?: string;
  readonly salary?: string;
  readonly apply?: number;
  readonly is_hide?: boolean;
}

export interface ExternalExperience {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
  readonly industry?: string;
  readonly position: string;
  readonly work_place?: string;
  readonly month_salary?: string;
  readonly work_industry?: string;
  readonly content: string;
  readonly is_hide?: boolean;
  readonly period: ExternalPeriod;
}

export interface ExternalIntern {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
  readonly industry?: string;
  readonly position: string;
  readonly work_place?: string;
  readonly month_salary?: string;
  readonly work_industry?: string;
  readonly content: string;
  readonly is_hide?: boolean;
  readonly period: ExternalPeriod;
}

export interface ExternalEducation {
  readonly id: string;
  readonly name: string;
  readonly major?: string;
  readonly degree?: string;
  readonly is_hide?: boolean;
  readonly recruit_type?: string;
  readonly course?: string;
  readonly period: ExternalPeriod;
  readonly content?: string;
}

export interface ExternalProgramExperience {
  readonly id: string;
  readonly name: string;
  readonly role?: string;
  readonly category?: string;
  readonly content: string;
  readonly is_hide?: boolean;
  readonly period: ExternalPeriod;
}

export interface ExternalSchoolExp {
  readonly id: string;
  readonly name: string;
  readonly position?: string;
  readonly content: string;
  readonly is_hide?: boolean;
  readonly period: ExternalPeriod;
}

export interface ExternalCustomModule {
  readonly name: string;
  readonly content: string;
  readonly is_hide?: boolean;
  readonly module_name: string;
}

export interface ExternalModule {
  readonly name: string;
  readonly is_hide: boolean;
  readonly position: 'left' | 'right';
}

export interface ExternalSkills {
  readonly content: string;
  readonly is_hide?: boolean;
}

export interface ExternalSelfEvaluation {
  readonly content: string;
  readonly is_hide?: boolean;
}

export interface ExternalQualifications {
  readonly content: string;
  readonly is_hide?: boolean;
}

export interface ExternalExtra {
  readonly custom: {
    readonly name: string;
    readonly content: string;
    readonly is_hide?: boolean;
  };
}

export interface ExternalResume {
  readonly base_info: ExternalBaseInfo;
  readonly job_intention?: ExternalJobIntention;
  readonly experience?: ExternalExperience[];
  readonly intern?: ExternalIntern[];
  readonly education?: ExternalEducation[];
  readonly program_experience?: ExternalProgramExperience[];
  readonly school_exps?: ExternalSchoolExp[];
  readonly extra?: ExternalExtra;
  readonly module?: ExternalModule[];
  readonly self_evaluation?: ExternalSelfEvaluation;
  readonly skills?: ExternalSkills;
  readonly qualifications?: ExternalQualifications;
  readonly lang_type?: string;
  readonly create_source?: number;
  readonly audit_status?: string;
  readonly custom_base_info?: unknown[];
  readonly custom_module_info?: ExternalCustomModule[];
}
