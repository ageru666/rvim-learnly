import type { MarkdownEditorLabels } from '../../shared/components/MarkdownEditor';
import { useT } from './useT';

/** Localized labels for the shared Markdown editor. */
export function useMarkdownLabels(): MarkdownEditorLabels {
  const { t } = useT();
  return {
    edit: t('app.markdown.edit'),
    preview: t('app.markdown.preview'),
    toolbar: t('app.markdown.toolbar'),
    empty: t('app.markdown.empty'),
    actions: {
      heading: t('app.markdown.heading'),
      bold: t('app.markdown.bold'),
      list: t('app.markdown.list'),
      code: t('app.markdown.code'),
      link: t('app.markdown.link'),
      image: t('app.markdown.image'),
    },
  };
}
