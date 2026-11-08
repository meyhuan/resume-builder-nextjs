import { z } from 'zod';

export const articleInput = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9\u4e00-\u9fa5]+(?:-[a-z0-9\u4e00-\u9fa5]+)*$/, '链接只支持小写字母、数字、中文和短横线'),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(1000),
  content: z.string().trim().min(1).max(100000),
  category: z.enum(['resume-writing', 'fresh-graduate', 'interview-tips', 'career-guide']),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});
export type ArticleInput = z.infer<typeof articleInput>;
