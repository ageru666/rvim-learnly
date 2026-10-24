import type { Response } from 'express';

export type Layout = 'main' | 'admin';

export interface PageOptions {
  /** Page title (already translated); the layout appends the brand. */
  title?: string;
  description?: string;
  layout?: Layout;
  status?: number;
}

/**
 * Renders `view` inside a layout. EJS has no layouts, so the page is rendered first and passed
 * to the layout as `body`; `res.locals` (user, t, locale, csrfToken, ...) are available to both.
 */
export function renderPage(
  res: Response,
  view: string,
  data: Record<string, unknown> = {},
  options: PageOptions = {},
): Promise<void> {
  const locals = { ...data, pageTitle: options.title, pageDescription: options.description };
  return new Promise((resolve, reject) => {
    res.render(view, locals, (viewError, body) => {
      if (viewError) {
        reject(viewError);
        return;
      }
      res.status(options.status ?? 200);
      res.render(`layouts/${options.layout ?? 'main'}`, { ...locals, body }, (layoutError, html) => {
        if (layoutError) reject(layoutError);
        else {
          res.send(html);
          resolve();
        }
      });
    });
  });
}
