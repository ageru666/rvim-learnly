/**
 * i18n keys used as custom Zod messages. Schemas never contain literal text; the server and the SPA
 * translate these keys (packages/i18n `validation.*`), and the parity test checks that every key exists.
 */
export const VALIDATION_MESSAGES = {
  passwordLetterAndDigit: 'validation.password.letterAndDigit',
  termsRequired: 'validation.terms.required',
  passwordsDiffer: 'validation.password.mismatch',
  slugFormat: 'validation.slug.format',
  videoUrl: 'validation.video.url',
  singleNeedsOneCorrect: 'validation.quiz.singleNeedsOneCorrect',
  multipleNeedsCorrect: 'validation.quiz.multipleNeedsCorrect',
} as const;

export type ValidationMessageKey = (typeof VALIDATION_MESSAGES)[keyof typeof VALIDATION_MESSAGES];
