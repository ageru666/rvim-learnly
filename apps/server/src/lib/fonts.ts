import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

/** Font stylesheets of the packages referenced by packages/design-tokens/fonts.css. */
const FONT_STYLESHEETS = [
  '@fontsource-variable/inter/wght.css',
  '@fontsource-variable/roboto-condensed/wght.css',
  '@fontsource/jetbrains-mono/400.css',
];

const designTokensDir = dirname(require.resolve('@learnly/design-tokens/theme.css'));

/** Directories with the woff2 files, served at /static/fonts for SSR pages and the SPA. */
export const FONT_DIRECTORIES = FONT_STYLESHEETS.map((stylesheet) =>
  join(dirname(require.resolve(stylesheet, { paths: [designTokensDir] })), 'files'),
);
