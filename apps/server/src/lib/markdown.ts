import { markdownSanitizeSchema } from '@learnly/contracts/markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, markdownSanitizeSchema)
  .use(rehypeHighlight)
  .use(rehypeStringify);

/** Renders user Markdown to sanitized HTML for SSR pages (same pipeline as the SPA). */
export function renderMarkdown(source: string): string {
  return String(processor.processSync(source));
}
