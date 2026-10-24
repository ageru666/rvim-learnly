import { AVATAR_MAX_BYTES, COVER_MAX_BYTES } from '@learnly/contracts/limits';
import multer from 'multer';

const FIELD_NAME = 'file';

function singleImage(maxBytes: number) {
  return multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 } }).single(
    FIELD_NAME,
  );
}

export const avatarUpload = singleImage(AVATAR_MAX_BYTES);
export const coverUpload = singleImage(COVER_MAX_BYTES);
