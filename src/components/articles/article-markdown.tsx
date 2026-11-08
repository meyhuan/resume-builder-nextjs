import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Raw HTML is deliberately disabled, including in the admin preview. */
export function ArticleMarkdown({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{content}</ReactMarkdown>;
}
