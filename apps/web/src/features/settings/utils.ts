import { passwordSchema, withPasswordConfirmation, emailSchema } from '@learnly/contracts/auth';
import { z } from 'zod';

export const passwordFormSchema = withPasswordConfirmation(
  z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema, newPasswordConfirm: z.string() }),
  { password: 'newPassword', confirm: 'newPasswordConfirm' },
);

export const emailFormSchema = z.object({ currentPassword: z.string().min(1), newEmail: emailSchema });
