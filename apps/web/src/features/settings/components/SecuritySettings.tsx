import { ChangeEmailForm } from './ChangeEmailForm';
import { ChangePasswordForm } from './ChangePasswordForm';
import { LogoutEverywhere } from './LogoutEverywhere';

interface SecuritySettingsProps {
  email: string;
}

/** Password, email and sessions: everything that protects the account. */
export function SecuritySettings({ email }: SecuritySettingsProps) {
  return (
    <div className="flex flex-col gap-6">
      <ChangePasswordForm />
      <ChangeEmailForm currentEmail={email} />
      <LogoutEverywhere />
    </div>
  );
}
