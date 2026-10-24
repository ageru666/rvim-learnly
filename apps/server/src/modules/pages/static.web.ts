import { Router } from 'express';
import { renderMarkdown } from '../../lib/markdown.js';
import { renderPage } from '../../lib/render.js';

/** FR-SITE-6: texts live in the dictionaries (Markdown), one template renders every page. */
const MARKDOWN_PAGES = ['about', 'terms', 'privacy', 'contacts'] as const;

export const staticPagesRouter = Router();

for (const page of MARKDOWN_PAGES) {
  staticPagesRouter.get(`/${page}`, async (req, res) => {
    const { title, body } = req.i18n.messages.site.pages[page];
    await renderPage(res, 'pages/static', { heading: title, bodyHtml: renderMarkdown(body) }, { title });
  });
}

staticPagesRouter.get('/faq', async (req, res) => {
  const faq = req.i18n.messages.site.pages.faq;
  await renderPage(res, 'pages/faq', { heading: faq.title, items: Object.values(faq.items) }, { title: faq.title });
});
