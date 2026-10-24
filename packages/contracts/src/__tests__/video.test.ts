import { describe, expect, it } from 'vitest';
import { buildEmbedUrl, parseVideoUrl } from '../video.js';

const ID = 'dQw4w9WgXcQ';

describe('parseVideoUrl', () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=30`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `  http://youtu.be/${ID}  `,
  ])('accepts YouTube link %s', (url) => {
    expect(parseVideoUrl(url)).toEqual({ provider: 'youtube', id: ID });
  });

  it.each(['https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871'])(
    'accepts Vimeo link %s',
    (url) => {
      expect(parseVideoUrl(url)).toEqual({ provider: 'vimeo', id: '76979871' });
    },
  );

  it.each([
    'not a url',
    'ftp://youtu.be/dQw4w9WgXcQ',
    'https://youtu.be/short',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/channel/abc',
    'https://www.youtube.com/embed/',
    'https://vimeo.com/',
    'https://vimeo.com/channels/staffpicks',
    'https://player.vimeo.com/other/123',
    'https://player.vimeo.com/video',
    'https://example.com/watch?v=dQw4w9WgXcQ',
  ])('rejects %s', (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });
});

describe('buildEmbedUrl', () => {
  it('builds a privacy-friendly YouTube embed with the interface language', () => {
    expect(buildEmbedUrl({ provider: 'youtube', id: ID }, 'en')).toBe(
      `https://www.youtube-nocookie.com/embed/${ID}?hl=en`,
    );
  });

  it('builds a Vimeo player URL', () => {
    expect(buildEmbedUrl({ provider: 'vimeo', id: '1' }, 'uk')).toBe(
      'https://player.vimeo.com/video/1',
    );
  });

  it('throws for an unknown provider', () => {
    expect(() => buildEmbedUrl({ provider: 'other' as never, id: '1' }, 'uk')).toThrow();
  });
});
