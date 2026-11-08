import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArticleMarkdown } from './article-markdown';
it('renders full semantic HTML without client JavaScript', () => {
  const html = renderToStaticMarkup(<ArticleMarkdown content={'## 求职建议\n\n**真实经历**\n\n- 项目成果\n\n| A | B |\n| - | - |\n| 1 | 2 |'} />);
  expect(html).toContain('<h2>求职建议</h2>'); expect(html).toContain('<strong>真实经历</strong>'); expect(html).toContain('<table>');
});
it('rejects raw HTML and unsafe link protocols in public pages and previews', () => {
  const html = renderToStaticMarkup(<ArticleMarkdown content={'<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert%281%29)'} />);
  expect(html).not.toContain('<script'); expect(html).not.toContain('onerror'); expect(html).not.toContain('javascript:');
});
