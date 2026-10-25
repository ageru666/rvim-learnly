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
import { useRequestEmailChangeMutation } from '../settingsApi';
import { formChecked, selectClientErrors } from '../settingsSlice';
import { checkForm, fieldErrorsFrom } from '../../../shared/utils/checkForm';
import { emailFormSchema } from '../utils';

interface ChangeEmailFormProps {
  currentEmail: string;
}

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
  const i18n = useT();
  const dispatch = useDispatch();
  const clientErrors = useSelector(selectClientErrors('email'));
  const [requestEmailChange, { isLoading, isSuccess, error, originalArgs }] = useRequestEmailChangeMutation();
  const serverErrors = isApiError(error) ? fieldErrorsFrom(error.details) : {};
  const errors = { ...serverErrors, ...clientErrors };
  const hasFieldErrors = Object.keys(serverErrors).length > 0;

  async function submit(form: HTMLFormElement) {
    const { data, errors: found } = checkForm(emailFormSchema, Object.fromEntries(new FormData(form)), i18n);
    dispatch(formChecked({ form: 'email', errors: found }));
    if (!data) return;
    const result = await requestEmailChange(data);
    if (!result.error) form.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(event.currentTarget);
  }

  return (
    <Card className="card-body">
      <h2 className="heading-md mb-1">{i18n.t('app.settings.email.heading')}</h2>
      <p className="mb-4 text-sm text-text-muted">{i18n.t('app.settings.email.current', { email: currentEmail })}</p>
      <form className="flex max-w-md flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {isSuccess && originalArgs && (
          <Alert kind="success">{i18n.t('app.settings.email.success', { email: originalArgs.newEmail })}</Alert>
        )}
        {error && !hasFieldErrors && <Alert kind="error">{describeError(error, i18n)}</Alert>}
        <FormField label={i18n.t('app.settings.email.new')} error={errors.newEmail}>
          {(control) => <Input {...control} name="newEmail" type="email" autoComplete="email" />}
        </FormField>
        <FormField label={i18n.t('app.settings.email.password')} error={errors.currentPassword}>
          {(control) => <Input {...control} name="currentPassword" type="password" autoComplete="current-password" />}
        </FormField>
        <Button type="submit" variant="primary" className="self-start" loading={isLoading}>
          {i18n.t('app.settings.email.submit')}
        </Button>
      </form>
    </Card>
  );
}
