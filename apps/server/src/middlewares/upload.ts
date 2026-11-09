import { AVATAR_MAX_BYTES, COVER_MAX_BYTES } from '@learnly/contracts/limits';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { AppError } from '../lib/errors.js';

const FIELD_NAME = 'file';

function singleImage(maxBytes: number): RequestHandler {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 } }).single(
    FIELD_NAME,
  );
  // A malformed multipart body or an unexpected field is the client's error, not a server failure (lab 5, ZAP).
  // A file over the limit keeps its own message in the error handler.
  return (req, res, next) => {
    upload(req, res, (error: unknown) => {
      if (!error || (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE')) {
        next(error);
        return;
      }
      next(new AppError('VALIDATION_ERROR', 'errors.invalidJson'));
    });
  };
}

export const avatarUpload = singleImage(AVATAR_MAX_BYTES);
export const coverUpload = singleImage(COVER_MAX_BYTES);
