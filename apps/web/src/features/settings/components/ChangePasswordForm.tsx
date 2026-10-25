import type { FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isApiError } from '../../../shared/api/apiError';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { FormField } from '../../../shared/components/FormField';
import { Input } from '../../../shared/components/Input';
import { describeError } from '../../../shared/utils/describeError';
import { useT } from '../../locale/useT';
import { useChangePasswordMutation } from '../settingsApi';
import { formChecked, selectClientErrors } from '../settingsSlice';
import { checkForm, fieldErrorsFrom } from '../../../shared/utils/checkForm';
import { passwordFormSchema } from '../utils';

export function ChangePasswordForm() {
  const i18n = useT();
  const dispatch = useDispatch();
  const clientErrors = useSelector(selectClientErrors('password'));
  const [changePassword, { isLoading, isSuccess, error }] = useChangePasswordMutation();
  const serverErrors = isApiError(error) ? fieldErrorsFrom(error.details) : {};
  const errors = { ...serverErrors, ...clientErrors };
  const hasFieldErrors = Object.keys(serverErrors).length > 0;

  async function submit(form: HTMLFormElement) {
    const { data, errors: found } = checkForm(passwordFormSchema, Object.fromEntries(new FormData(form)), i18n);
    dispatch(formChecked({ form: 'password', errors: found }));
    if (!data) return;
    const result = await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
    if (!result.error) form.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(event.currentTarget);
  }

  return (
    <Card className="card-body">
      <h2 className="heading-md mb-4">{i18n.t('app.settings.password.heading')}</h2>
      <form className="flex max-w-md flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {isSuccess && <Alert kind="success">{i18n.t('app.settings.password.success')}</Alert>}
        {error && !hasFieldErrors && <Alert kind="error">{describeError(error, i18n)}</Alert>}
        <FormField label={i18n.t('app.settings.password.current')} error={errors.currentPassword}>
          {(control) => <Input {...control} name="currentPassword" type="password" autoComplete="current-password" />}
        </FormField>
        <FormField
          label={i18n.t('app.settings.password.new')}
          hint={i18n.t('site.auth.register.passwordHint')}
          error={errors.newPassword}
        >
          {(control) => <Input {...control} name="newPassword" type="password" autoComplete="new-password" />}
        </FormField>
        <FormField label={i18n.t('app.settings.password.confirm')} error={errors.newPasswordConfirm}>
          {(control) => <Input {...control} name="newPasswordConfirm" type="password" autoComplete="new-password" />}
        </FormField>
        <Button type="submit" variant="primary" className="self-start" loading={isLoading}>
          {i18n.t('app.settings.password.submit')}
        </Button>
      </form>
    </Card>
  );
}
