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
