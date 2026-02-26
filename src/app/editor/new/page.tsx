import type { Metadata } from 'next';
import ResumeEditor from '@/components/ResumeEditor';

export const metadata: Metadata = {
  title: '创建新简历 - 空白简历编辑器',
  description: '从零开始创建你的专业简历，无需登录即可预览和编辑，支持多种模板和 AI 辅助功能。',
  robots: { index: false, follow: false },
};

/**
 * Guest-friendly editor page — renders ResumeEditor with default (blank)
 * data, no authentication required. Login is prompted only when the user
 * attempts to save.
 */
export default function NewEditorPage(): React.ReactElement {
  return <ResumeEditor />;
}
