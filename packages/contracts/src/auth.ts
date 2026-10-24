import { z } from 'zod';
import { LIMITS } from './limits.js';
import { meSchema } from './me.js';
import { VALIDATION_MESSAGES } from './validation.js';

export const emailSchema = z.email().max(LIMITS.email.max);

/** FR-AUTH-1: at least 8 characters with at least one letter and one digit. */
export const passwordSchema = z
  .string()
  .min(LIMITS.password.min)
  .max(LIMITS.password.max)
  .regex(/\p{L}/u, { error: VALIDATION_MESSAGES.passwordLetterAndDigit })
  .regex(/\d/, { error: VALIDATION_MESSAGES.passwordLetterAndDigit });

export const userNameSchema = z.string().trim().min(LIMITS.userName.min).max(LIMITS.userName.max);

export const registerSchema = z.object({
  name: userNameSchema,
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, { error: VALIDATION_MESSAGES.termsRequired }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(LIMITS.password.max),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(1).optional() });

export const tokenSchema = z.object({ token: z.string().min(1) });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({ token: z.string().min(1), password: passwordSchema });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
  /** Bearer clients name the session to keep; cookie clients keep the one in their cookie. */
  refreshToken: z.string().min(1).optional(),
});

export const changeEmailSchema = z.object({
  currentPassword: z.string().min(1),
  newEmail: emailSchema,
});

/** Forms that ask for the password twice report a mismatch on the confirmation field. */
export function withPasswordConfirmation<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  fields: { password: keyof T & string; confirm: keyof T & string } = {
    password: 'password',
    confirm: 'passwordConfirm',
  },
) {
  return schema.refine((value) => value[fields.password] === value[fields.confirm], {
    path: [fields.confirm],
    error: VALIDATION_MESSAGES.passwordsDiffer,
  });
}

export const sessionTokensSchema = z.object({ accessToken: z.string(), refreshToken: z.string() });

export const authResponseSchema = sessionTokensSchema.extend({ user: meSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;
