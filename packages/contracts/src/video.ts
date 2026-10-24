import type { Locale } from './enums.js';

export type VideoProvider = 'youtube' | 'vimeo';

export interface VideoRef {
  provider: VideoProvider;
  id: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

function youtubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1);
  if (!YOUTUBE_HOSTS.has(url.hostname)) return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  const [, prefix, id] = url.pathname.split('/');
  return prefix === 'embed' && id ? id : null;
}

function vimeoId(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean);
  if (url.hostname === 'vimeo.com' || url.hostname === 'www.vimeo.com') return segments[0] ?? null;
  if (url.hostname === 'player.vimeo.com' && segments[0] === 'video') return segments[1] ?? null;
  return null;
}

/** Recognizes YouTube and Vimeo links; anything else is not an accepted video URL. */
export function parseVideoUrl(raw: string): VideoRef | null {
  const url = parseUrl(raw);
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) return null;

  const youtube = youtubeId(url);
  if (youtube && YOUTUBE_ID.test(youtube)) return { provider: 'youtube', id: youtube };

  const vimeo = vimeoId(url);
  if (vimeo && VIMEO_ID.test(vimeo)) return { provider: 'vimeo', id: vimeo };

  return null;
}

/** Embed URLs are always built locally from the id, never taken from third-party responses. */
export function buildEmbedUrl(video: VideoRef, locale: Locale): string {
  switch (video.provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${video.id}?hl=${locale}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${video.id}`;
    default:
      return assertNever(video.provider);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected video provider: ${String(value)}`);
}
