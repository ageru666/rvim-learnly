import type { Me } from '@learnly/contracts/me';
import { Trash2, Upload } from 'lucide-react';
import { useId } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from '../../../shared/components/Alert';
import { Avatar } from '../../../shared/components/Avatar';
import { Button } from '../../../shared/components/Button';
import { buttonClass } from '../../../shared/components/buttonClass';
import { Card } from '../../../shared/components/Card';
import { Spinner } from '../../../shared/components/Spinner';
import { cx } from '../../../shared/utils/cx';
import { describeError } from '../../../shared/utils/describeError';
import { useT } from '../../locale/useT';
import { useRemoveAvatarMutation, useUploadAvatarMutation } from '../profileApi';
import { avatarChecked, selectAvatarProblem } from '../profileSlice';
import { avatarFileProblem } from '../utils';

const PREVIEW_SIZE = 96;

/** FR-PROFILE-2: the new avatar is shown as soon as the server has cropped it. */
export function AvatarSettings({ me }: { me: Me }) {
  const i18n = useT();
  const { t } = i18n;
  const id = useId();
  const dispatch = useDispatch();
  const problem = useSelector(selectAvatarProblem);
  const [upload, uploadState] = useUploadAvatarMutation();
  const [remove, removeState] = useRemoveAvatarMutation();
  const error = uploadState.error ?? removeState.error;

  function choose(file: File) {
    const found = avatarFileProblem(file);
    dispatch(avatarChecked(found));
    if (!found) void upload(file);
  }

  return (
    <Card className="card-body">
      <h2 className="heading-md mb-4">{t('app.profile.avatar.heading')}</h2>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={me.name} src={me.avatarUrl} size={PREVIEW_SIZE} />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <label htmlFor={id} className={cx(buttonClass('outline', 'sm'), 'self-start')}>
              {uploadState.isLoading ? <Spinner size={14} /> : <Upload aria-hidden size={14} />}
              {t('app.profile.avatar.upload')}
            </label>
            <input
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploadState.isLoading}
              aria-describedby={`${id}-hint`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) choose(file);
                event.target.value = '';
              }}
            />
            {me.avatarUrl && (
              <Button size="sm" variant="ghost" loading={removeState.isLoading} onClick={() => void remove()}>
                <Trash2 aria-hidden size={14} />
                {t('app.profile.avatar.remove')}
              </Button>
            )}
          </div>
          <p id={`${id}-hint`} className="field-hint">
            {t('app.profile.avatar.hint')}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2" aria-live="polite">
        {problem && <Alert kind="error">{i18n.translate(problem)}</Alert>}
        {error && <Alert kind="error">{describeError(error, i18n)}</Alert>}
        {uploadState.isSuccess && !problem && <Alert kind="success">{t('app.profile.avatar.uploaded')}</Alert>}
        {removeState.isSuccess && !me.avatarUrl && <Alert kind="success">{t('app.profile.avatar.removed')}</Alert>}
      </div>
    </Card>
  );
}
