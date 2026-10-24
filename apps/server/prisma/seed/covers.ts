import type { Accent } from '@learnly/contracts/enums';
import sharp from 'sharp';
import { saveCover } from '../../src/lib/images.js';

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

/** A geometric cover without text, so it renders the same on every machine (no fonts needed). */
function coverSvg(accent: Accent, variant: number): string {
  const { background, shape, ink } = COVER_COLORS[accent];
  const offset = (variant % 4) * 120;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="100%" height="100%" fill="${background}"/>
  <circle cx="${900 - offset}" cy="${260 + offset / 2}" r="220" fill="${shape}" opacity="0.85"/>
  <rect x="${160 + offset}" y="380" width="360" height="220" rx="32" fill="${ink}" opacity="0.9"/>
  <circle cx="${300 + offset}" cy="220" r="70" fill="none" stroke="${ink}" stroke-width="18"/>
  <path d="M${640 + offset / 2} 600 L${820 + offset / 2} 420 L${1000 + offset / 2} 600 Z" fill="${shape}" opacity="0.55"/>
</svg>`;
}

export async function generateCover(accent: Accent, variant: number): Promise<string> {
  const png = await sharp(Buffer.from(coverSvg(accent, variant))).png().toBuffer();
  return saveCover(png);
}
