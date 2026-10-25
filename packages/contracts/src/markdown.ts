import { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';

/**
 * The one sanitization schema for Markdown rendered on the server (SSR) and in the SPA.
 * GitHub-style defaults: no raw HTML, safe URL protocols only, `language-*` classes on code.
 * Syntax highlighting runs after sanitization, so its classes do not need to be allowed here.
 */
export const markdownSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
};

interface HastNode {
  type: string;
  tagName?: string;
  children?: HastNode[];
}

const HEADING = /^h([1-6])$/;
const LOWEST_HEADING = 6;

function demote(node: HastNode): void {
  const level = node.tagName ? HEADING.exec(node.tagName)?.[1] : undefined;
  if (level) node.tagName = `h${Math.min(Number(level) + 1, LOWEST_HEADING)}`;
  node.children?.forEach(demote);
}

/** Rehype plugin: user content sits under the page's own `<h1>`, so its headings start at `<h2>`. */
export function rehypeDemoteHeadings() {
  return (tree: HastNode): void => demote(tree);
}
