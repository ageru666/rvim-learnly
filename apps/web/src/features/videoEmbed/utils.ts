import type { Locale } from '@learnly/contracts/enums';
import { buildEmbedUrl, parseVideoUrl, type VideoProvider } from '@learnly/contracts/video';

export interface VideoMeta {
  provider: VideoProvider;
  title: string;
  authorName: string | null;
  thumbnailUrl: string | null;
  /** Built locally from the video id, never taken from the noembed response. */
  embedUrl: string;
}

interface RawNoembed {
  error?: string;
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

/** null when noembed reports an error or the link is not a recognized video. */
export function toVideoMeta(raw: RawNoembed, url: string, locale: Locale): VideoMeta | null {
  const video = parseVideoUrl(url);
  if (!video || raw.error || !raw.title) return null;
  return {
    provider: video.provider,
    title: raw.title,
    authorName: raw.author_name ?? null,
    thumbnailUrl: raw.thumbnail_url ?? null,
    embedUrl: buildEmbedUrl(video, locale),
  };
}
