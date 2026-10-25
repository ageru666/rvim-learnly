import { LIMITS } from '@learnly/contracts/limits';
import { USER_LINKS, type Me } from '@learnly/contracts/me';
import type { FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isApiError } from '../../../shared/api/apiError';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { FormField } from '../../../shared/components/FormField';
import { Input } from '../../../shared/components/Input';
import { Textarea } from '../../../shared/components/Textarea';
import { checkForm, fieldErrorsFrom } from '../../../shared/utils/checkForm';
import { describeError } from '../../../shared/utils/describeError';
import { useT } from '../../locale/useT';
import { useUpdateProfileMutation } from '../profileApi';
import { profileChecked, selectProfileErrors } from '../profileSlice';
import { linkDefaults, profileFormSchema, toProfileValues } from '../utils';

export function ProfileForm({ me }: { me: Me }) {
  const i18n = useT();
  const { t } = i18n;
  const dispatch = useDispatch();
  const clientErrors = useSelector(selectProfileErrors);
  const [updateProfile, { isLoading, isSuccess, error }] = useUpdateProfileMutation();
  const serverErrors = isApiError(error) ? fieldErrorsFrom(error.details) : {};
  const errors = { ...serverErrors, ...clientErrors };
  const hasFieldErrors = Object.keys(serverErrors).length > 0;
  const links = linkDefaults(me.links);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = toProfileValues(new FormData(event.currentTarget).entries());
    const { data, errors: found } = checkForm(profileFormSchema, values, i18n);
    dispatch(profileChecked(found));
    if (data) void updateProfile(data);
  }

  return (
    <Card className="card-body">
      <h2 className="heading-md mb-1">{t('app.profile.heading')}</h2>
      <p className="mb-4 text-sm text-text-muted">{t('app.profile.text')}</p>
      <form className="flex max-w-xl flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {isSuccess && <Alert kind="success">{t('app.profile.saved')}</Alert>}
        {error && !hasFieldErrors && <Alert kind="error">{describeError(error, i18n)}</Alert>}
        <FormField label={t('app.profile.name')} error={errors.name}>
          {(control) => (
            <Input {...control} name="name" defaultValue={me.name} autoComplete="name" maxLength={LIMITS.userName.max} />
          )}
        </FormField>
        <FormField label={t('app.profile.bio')} hint={t('app.profile.bioHint')} error={errors.bio}>
          {(control) => <Textarea {...control} name="bio" defaultValue={me.bio ?? ''} maxLength={LIMITS.bio.max} />}
        </FormField>
        <fieldset className="flex flex-col gap-4">
          <legend className="field-label mb-2">{t('app.profile.links')}</legend>
          {USER_LINKS.map((link) => (
            <FormField key={link} label={t(`app.profile.${link}`)} hint={t('app.profile.linkHint')} error={errors[`links.${link}`]}>
              {(control) => (
                <Input {...control} name={`links.${link}`} type="url" inputMode="url" defaultValue={links[link]} maxLength={LIMITS.link.max} />
              )}
            </FormField>
          ))}
        </fieldset>
        <Button type="submit" variant="primary" className="self-start" loading={isLoading}>
          {t('app.profile.submit')}
        </Button>
      </form>
    </Card>
  );
}
