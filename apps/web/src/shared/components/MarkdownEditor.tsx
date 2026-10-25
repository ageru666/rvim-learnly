import type { Locale } from '@learnly/contracts/enums';
import { Bold, Code, Heading2, Image, Link2, List, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { cx } from '../utils/cx';
import { insertMarkdown, type MarkdownAction } from '../utils/markdownInsert';
import type { FieldControlProps } from './FormField';
import { MarkdownView } from './MarkdownView';

export interface MarkdownEditorLabels {
  edit: string;
  preview: string;
  toolbar: string;
  empty: string;
  actions: Record<MarkdownAction, string>;
}

interface MarkdownEditorProps extends Partial<FieldControlProps> {
  value: string;
  onChange: (value: string) => void;
  labels: MarkdownEditorLabels;
  /** The content language, for the preview and spell checking. */
  lang?: Locale;
  rows?: number;
  readOnly?: boolean;
}

const ACTIONS: { action: MarkdownAction; icon: LucideIcon }[] = [
  { action: 'heading', icon: Heading2 },
  { action: 'bold', icon: Bold },
  { action: 'list', icon: List },
  { action: 'code', icon: Code },
  { action: 'link', icon: Link2 },
  { action: 'image', icon: Image },
];

/** FR-TEACH-4: Markdown with "Edit / Preview" and a quick-insert toolbar. */
export function MarkdownEditor({ value, onChange, labels, lang, rows = 12, readOnly = false, ...control }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const textarea = useRef<HTMLTextAreaElement>(null);

  function apply(action: MarkdownAction) {
    const element = textarea.current;
    const selection = element ? { start: element.selectionStart, end: element.selectionEnd } : { start: value.length, end: value.length };
    const result = insertMarkdown(value, selection, action);
    onChange(result.value);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  const tabClass = (active: boolean) =>
    cx('focus-ring rounded-md px-3 py-1 text-sm', active ? 'bg-surface-selected font-semibold' : 'text-text-muted');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group">
          <button type="button" className={tabClass(mode === 'edit')} aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>
            {labels.edit}
          </button>
          <button type="button" className={tabClass(mode === 'preview')} aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>
            {labels.preview}
          </button>
        </div>
        {mode === 'edit' && !readOnly && (
          <div className="flex gap-1" role="toolbar" aria-label={labels.toolbar}>
            {ACTIONS.map(({ action, icon: Icon }) => (
              <button
                key={action}
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                aria-label={labels.actions[action]}
                title={labels.actions[action]}
                onClick={() => apply(action)}
              >
                <Icon aria-hidden size={16} />
              </button>
            ))}
          </div>
        )}
      </div>
      {mode === 'edit' ? (
        <textarea
          {...control}
          ref={textarea}
          className="input font-mono text-sm"
          rows={rows}
          value={value}
          lang={lang}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <div className="min-h-32 rounded-md border border-border p-4">
          {value.trim() ? <MarkdownView source={value} lang={lang} /> : <p className="text-text-muted">{labels.empty}</p>}
        </div>
      )}
    </div>
  );
}
