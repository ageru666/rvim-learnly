import { markdownSanitizeSchema, rehypeDemoteHeadings } from '@learnly/contracts/markdown';
import type { Locale } from '@learnly/contracts/enums';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

interface MarkdownViewProps {
  source: string;
  /** Content language of the course, so screen readers pronounce it correctly. */
  lang?: Locale;
}

/** Renders user Markdown with the same sanitization schema as the server; its headings start at h2. */
export function MarkdownView({ source, lang }: MarkdownViewProps) {
  return (
    <div className="prose-content" lang={lang}>
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema], rehypeDemoteHeadings, rehypeHighlight]}>
        {source}
      </Markdown>
    </div>
  );
}
