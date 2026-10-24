import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { passwordSchema, registerSchema, withPasswordConfirmation } from '../auth.js';
import { VALIDATION_MESSAGES } from '../validation.js';

describe('passwordSchema', () => {
  it('needs 8 characters with a letter and a digit', () => {
    expect(passwordSchema.safeParse('secret123').success).toBe(true);
    expect(passwordSchema.safeParse('пароль123').success).toBe(true);
    expect(passwordSchema.safeParse('a1').success).toBe(false);
    const lettersOnly = passwordSchema.safeParse('onlyletters');
    expect(lettersOnly.error?.issues[0]?.message).toBe(VALIDATION_MESSAGES.passwordLetterAndDigit);
  });
});

describe('registerSchema', () => {
  it('requires accepting the terms', () => {
    const result = registerSchema.safeParse({ name: 'Олена', email: 'o@x.ua', password: 'secret123', acceptTerms: false });
    expect(result.error?.issues[0]?.message).toBe(VALIDATION_MESSAGES.termsRequired);
  });
});

describe('withPasswordConfirmation', () => {
  const schema = withPasswordConfirmation(z.object({ password: z.string(), passwordConfirm: z.string() }));

  it('reports a mismatch on the confirmation field', () => {
    expect(schema.safeParse({ password: 'a', passwordConfirm: 'a' }).success).toBe(true);
    const issue = schema.safeParse({ password: 'a', passwordConfirm: 'b' }).error?.issues[0];
    expect(issue).toMatchObject({ path: ['passwordConfirm'], message: VALIDATION_MESSAGES.passwordsDiffer });
  });

  it('works with other field names', () => {
    const renamed = withPasswordConfirmation(z.object({ newPassword: z.string(), repeat: z.string() }), {
      password: 'newPassword',
      confirm: 'repeat',
    });
    expect(renamed.safeParse({ newPassword: 'a', repeat: 'b' }).error?.issues[0]?.path).toEqual(['repeat']);
  });
});
