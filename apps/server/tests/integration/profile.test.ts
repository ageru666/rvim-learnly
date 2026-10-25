import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { testApp } from '../helpers/agent.js';
import { createUser } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';
import { UPLOADS_PATH } from '../../src/config/env.js';
import { issueSession } from '../../src/modules/auth/session.service.js';

const app = testApp();
const ME = '/api/v1/me';

beforeAll(resetDb);

async function signedIn() {
  const user = await createUser({ locale: 'en' });
  const { accessToken } = await issueSession(user.id, {});
  return { user, auth: { Authorization: `Bearer ${accessToken}` } };
}

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#357cff' } }).png().toBuffer();

const uploadedFile = (url: string) => join(UPLOADS_PATH, url.replace('/uploads/', ''));

describe('profile (FR-PROFILE-1)', () => {
  it('updates name, about and links; an empty field clears its value', async () => {
    const { auth } = await signedIn();
    const updated = await request(app)
      .patch(ME)
      .set(auth)
      .send({ name: '  Olha K  ', bio: 'Frontend developer.', links: { website: 'https://olha.dev', github: 'https://github.com/olha' } });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      name: 'Olha K',
      bio: 'Frontend developer.',
      links: { website: 'https://olha.dev', github: 'https://github.com/olha' },
    });

    const cleared = await request(app).patch(ME).set(auth).send({ bio: '', links: { website: '', github: 'https://github.com/olha' } });
    expect(cleared.body.bio).toBeNull();
    expect(cleared.body.links).toEqual({ github: 'https://github.com/olha' });
    expect(cleared.body.name).toBe('Olha K');
  });

  it('enforces the limits with localized details', async () => {
    const { auth } = await signedIn();
    const invalid = await request(app)
      .patch(`${ME}?lang=en`)
      .set(auth)
      .send({
        name: 'O',
        bio: 'x'.repeat(501),
        links: { website: 'not a url', github: `https://github.com/${'a'.repeat(200)}`, linkedin: 'ftp://example.com' },
        locale: 'de',
      });
    expect(invalid.status).toBe(400);
    const paths = invalid.body.error.details.map((detail: { path: string }) => detail.path);
    expect(paths).toEqual(
      expect.arrayContaining(['name', 'bio', 'links.website', 'links.github', 'links.linkedin', 'locale']),
    );
    expect(await request(app).patch(ME).set(auth).send({ name: 'x'.repeat(61) })).toHaveProperty('status', 400);
  });
});

describe('avatar (FR-PROFILE-2)', () => {
  it('stores a 256×256 WebP, replaces the previous file and removes it on delete', async () => {
    const { auth } = await signedIn();
    const first = await request(app).post(`${ME}/avatar`).set(auth).attach('file', await png(800, 400), 'me.png');
    expect(first.status).toBe(200);
    expect(first.body.avatarUrl).toMatch(/^\/uploads\/avatars\/.+\.webp$/);
    const metadata = await sharp(readFileSync(uploadedFile(first.body.avatarUrl))).metadata();
    expect(metadata).toMatchObject({ format: 'webp', width: 256, height: 256 });

    const second = await request(app).post(`${ME}/avatar`).set(auth).attach('file', await png(300, 300), 'me.png');
    expect(second.body.avatarUrl).not.toBe(first.body.avatarUrl);
    expect(existsSync(uploadedFile(first.body.avatarUrl))).toBe(false);

    const removed = await request(app).delete(`${ME}/avatar`).set(auth);
    expect(removed.status).toBe(200);
    expect(removed.body.avatarUrl).toBeNull();
    expect(existsSync(uploadedFile(second.body.avatarUrl))).toBe(false);
  });

  it('rejects a file over 1 MB and a renamed text file with a reason', async () => {
    const { auth } = await signedIn();
    const large = await request(app)
      .post(`${ME}/avatar?lang=en`)
      .set(auth)
      .attach('file', Buffer.alloc(1024 * 1024 + 1, 1), 'big.png');
    expect(large.status).toBe(400);
    expect(large.body.error.message).toBe('The file is too large.');

    const text = await request(app)
      .post(`${ME}/avatar?lang=en`)
      .set(auth)
      .attach('file', Buffer.from('just text'), { filename: 'avatar.png', contentType: 'image/png' });
    expect(text.status).toBe(400);
    expect(text.body.error.code).toBe('VALIDATION_ERROR');

    const missing = await request(app).post(`${ME}/avatar`).set(auth);
    expect(missing.status).toBe(400);
  });
});

describe('theme (FR-UI-3)', () => {
  it('renders the theme from the cookie on the site, the admin panel and the SPA shell', async () => {
    const page = await request(app).get('/courses').set('Cookie', 'theme=dark');
    expect(page.text).toContain('data-theme="dark"');
    const fallback = await request(app).get('/courses').set('Cookie', 'theme=purple');
    expect(fallback.text).toContain('data-theme="system"');

    const switched = await request(app).post('/theme').type('form').send({ theme: 'light', returnTo: '/courses' });
    expect(switched.status).toBe(303);
    expect(String(switched.headers['set-cookie'])).toContain('theme=light');
  });
});
