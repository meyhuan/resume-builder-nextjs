import type { TextBlock } from '@/entities/blocks/text-block';
import type { ListBlock } from '@/entities/blocks/list-block';
import type { ExperienceBlock } from '@/entities/blocks/experience-block';
import type { EducationBlock } from '@/entities/blocks/education-block';
import type { ProjectBlock } from '@/entities/blocks/project-block';
import type { CampusBlock } from '@/entities/blocks/campus-block';

/**
 * Union type of allowed block variants.
 */
export type ResumeBlock = TextBlock | ListBlock | ExperienceBlock | EducationBlock | ProjectBlock | CampusBlock;
