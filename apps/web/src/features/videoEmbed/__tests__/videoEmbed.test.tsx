import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { toVideoMeta } from '../utils';
import { VideoMetaCard } from '../VideoMetaCard';

const YOUTUBE = 'https://youtu.be/dQw4w9WgXcQ';

describe('toVideoMeta', () => {
  it('normalizes noembed and builds the embed URL locally', () => {
    expect(toVideoMeta({ title: 'Song', author_name: 'Rick', thumbnail_url: 'https://i.ytimg.com/x.jpg' }, YOUTUBE, 'en')).toEqual({
      provider: 'youtube',
      title: 'Song',
      authorName: 'Rick',
      thumbnailUrl: 'https://i.ytimg.com/x.jpg',
      embedUrl: expect.stringContaining('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'),
    });
    expect(toVideoMeta({ title: 'Clip' }, 'https://vimeo.com/76979871', 'uk')).toMatchObject({ provider: 'vimeo', authorName: null, thumbnailUrl: null });
  });

  it('treats an error field, a missing title or an unknown link as not found', () => {
    expect(toVideoMeta({ error: '404 Not Found' }, YOUTUBE, 'en')).toBeNull();
    expect(toVideoMeta({}, YOUTUBE, 'en')).toBeNull();
    expect(toVideoMeta({ title: 'x' }, 'https://example.com', 'en')).toBeNull();
  });
});

describe('VideoMetaCard', () => {
  it('shows the title and author, or a warning for an unknown video', async () => {
    document.cookie = 'locale=en; path=/';
    server.use(http.get('https://noembed.com/embed', () => HttpResponse.json({ title: 'Never Gonna Give You Up', author_name: 'Rick Astley' })));
    const { unmount } = renderWithStore(<VideoMetaCard url={YOUTUBE} />);
    expect(await screen.findByText('Never Gonna Give You Up')).toBeInTheDocument();
    expect(await screen.findByText('By Rick Astley')).toBeInTheDocument();
    unmount();

    server.use(http.get('https://noembed.com/embed', () => HttpResponse.json({ error: '404 Not Found' })));
    renderWithStore(<VideoMetaCard url="https://youtu.be/missing0000" />);
    expect(await screen.findByText('No video was found at this link.')).toBeInTheDocument();
  });

  it('never blocks the editor when noembed is down', async () => {
    document.cookie = 'locale=en; path=/';
    server.use(http.get('https://noembed.com/embed', () => HttpResponse.error()));
    renderWithStore(<VideoMetaCard url="https://youtu.be/offline00000" />);
    expect(await screen.findByText(/Could not check the video/)).toBeInTheDocument();
  });
});
