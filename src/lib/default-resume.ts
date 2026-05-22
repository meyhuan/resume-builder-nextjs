import type { ResumeData } from '@/entities/resume/resume-data'
import { mapExternalResume } from '@/io/external-resume-importer'
import { BLANK_RESUME_JSON } from '@/io/default-resume-data'

export function createDefaultResume(): ResumeData {
  return {
    ...mapExternalResume(BLANK_RESUME_JSON),
    jobIntentionVisible: true,
  }
}
