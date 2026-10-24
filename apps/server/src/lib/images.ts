import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { UPLOADS_PATH } from '../config/env.js';
import { AppError } from './errors.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UPLOADS_URL_PREFIX = '/uploads/';
const WEBP_QUALITY = 82;

const AVATAR_SIZE = 256;
const COVER_WIDTH = 1280;
const COVER_HEIGHT = 720;

type UploadKind = 'avatars' | 'covers';

/** Checks the real file signature, not the extension or the client-sent MIME type. */
async function assertImage(buffer: Buffer): Promise<void> {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !ALLOWED_MIME_TYPES.has(type.mime)) {
    throw new AppError('VALIDATION_ERROR', 'errors.upload.invalidType');
  }
}

async function store(kind: UploadKind, image: Buffer): Promise<string> {
  const directory = join(UPLOADS_PATH, kind);
  await mkdir(directory, { recursive: true });
  const fileName = `${randomUUID()}.webp`;
  await writeFile(join(directory, fileName), image);
  return `${UPLOADS_URL_PREFIX}${kind}/${fileName}`;
}

export async function saveAvatar(buffer: Buffer): Promise<string> {
  await assertImage(buffer);
  const image = await sharp(buffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return store('avatars', image);
}

export async function saveCover(buffer: Buffer): Promise<string> {
  await assertImage(buffer);
  const image = await sharp(buffer)
    .resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'cover' })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return store('covers', image);
}

/** Removes a previously stored upload; unknown or already removed files are ignored. */
export async function deleteUpload(url: string | null): Promise<void> {
  if (!url?.startsWith(UPLOADS_URL_PREFIX)) return;
  try {
    await unlink(join(UPLOADS_PATH, url.slice(UPLOADS_URL_PREFIX.length)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
