import { join } from 'node:path';
import { ACCENTS, type Accent } from '@learnly/contracts/enums';
import sharp from 'sharp';
import { SERVER_ROOT } from '../../src/config/env.js';

/** Background and shape colours per category accent (light tag tones from the design tokens). */
const COVER_COLORS: Record<Accent, { background: string; shape: string; ink: string }> = {
  yellow: { background: '#fff5dc', shape: '#ffb411', ink: '#8a5a00' },
  green: { background: '#e8fbf4', shape: '#10d690', ink: '#08805a' },
  cyan: { background: '#e3f7fd', shape: '#1abbe5', ink: '#0a7491' },
  blue: { background: '#eaf0ff', shape: '#357cff', ink: '#2a52e0' },
  indigo: { background: '#ece9fd', shape: '#4123e8', ink: '#4123e8' },
  red: { background: '#fdeceb', shape: '#f94128', ink: '#c4311c' },
  pink: { background: '#fbe7f2', shape: '#d81879', ink: '#b0145f' },
  magenta: { background: '#fbe7f2', shape: '#b20c6f', ink: '#a40d66' },
};

const WIDTH = 1280;
const HEIGHT = 720;
/** The quality of uploaded covers (src/lib/images.ts). */
const WEBP_QUALITY = 82;
const COVER_VARIANTS = 4;

/**
 * Demo covers are static files in src/public/covers, served at /static/covers. Unlike uploads they exist on
 * every server, including one with a read-only or ephemeral disk, whichever machine ran the seed.
 */
export const STATIC_COVERS_DIR = join(SERVER_ROOT, 'src', 'public', 'covers');

export function seedCoverUrl(accent: Accent, variant: number): string {
  return `/static/covers/${coverFileName(accent, variant % COVER_VARIANTS)}`;
}

export function coverFileName(accent: Accent, variant: number): string {
  return `${accent}-${variant}.webp`;
}

/** A geometric cover without text, so it renders the same on every machine (no fonts needed). */
function coverSvg(accent: Accent, variant: number): string {
  const { background, shape, ink } = COVER_COLORS[accent];
  const offset = (variant % COVER_VARIANTS) * 120;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="100%" height="100%" fill="${background}"/>
  <circle cx="${900 - offset}" cy="${260 + offset / 2}" r="220" fill="${shape}" opacity="0.85"/>
  <rect x="${160 + offset}" y="380" width="360" height="220" rx="32" fill="${ink}" opacity="0.9"/>
  <circle cx="${300 + offset}" cy="220" r="70" fill="none" stroke="${ink}" stroke-width="18"/>
  <path d="M${640 + offset / 2} 600 L${820 + offset / 2} 420 L${1000 + offset / 2} 600 Z" fill="${shape}" opacity="0.55"/>
</svg>`;
}

export function renderCover(accent: Accent, variant: number): Promise<Buffer> {
  return sharp(Buffer.from(coverSvg(accent, variant))).webp({ quality: WEBP_QUALITY }).toBuffer();
}

export const ALL_COVERS = ACCENTS.flatMap((accent) => Array.from({ length: COVER_VARIANTS }, (_, variant) => ({ accent, variant })));
