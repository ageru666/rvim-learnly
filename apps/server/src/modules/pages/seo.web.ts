import { Router } from 'express';
import { config } from '../../config/env.js';
import { listSitemapEntries } from '../catalog/catalog.service.js';

const STATIC_PATHS = ['/', '/courses', '/about', '/faq', '/teach'];

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

export const seoRouter = Router();

seoRouter.get('/sitemap.xml', async (_req, res) => {
  const { courses, instructors } = await listSitemapEntries();
  const paths = [
    ...STATIC_PATHS,
    ...courses.map((slug) => `/courses/${slug}`),
    ...instructors.map((id) => `/instructors/${id}`),
  ];
  const urls = paths.map((path) => `  <url><loc>${escapeXml(new URL(path, config.APP_URL).toString())}</loc></url>`);
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  );
});

seoRouter.get('/robots.txt', (_req, res) => {
  const sitemap = new URL('/sitemap.xml', config.APP_URL).toString();
  res.type('text/plain').send(`User-agent: *\nDisallow: /app\nDisallow: /admin\nDisallow: /api\nSitemap: ${sitemap}\n`);
});
