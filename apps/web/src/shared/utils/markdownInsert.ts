export type MarkdownAction = 'heading' | 'bold' | 'list' | 'code' | 'link' | 'image';

interface Selection {
  start: number;
  end: number;
}

/** The syntax of each toolbar action around the selection; line syntax starts on its own line. */
const WRAPPERS: Record<MarkdownAction, { before: string; after: string; lineStart: boolean }> = {
  heading: { before: '## ', after: '', lineStart: true },
  bold: { before: '**', after: '**', lineStart: false },
  list: { before: '- ', after: '', lineStart: true },
  code: { before: '`', after: '`', lineStart: false },
  link: { before: '[', after: '](https://)', lineStart: false },
  image: { before: '![', after: '](https://)', lineStart: false },
};

/**
 * Returns the new text and the cursor position: after the fragment when text was selected, or
 * inside the markers otherwise, so the user can type right away (no placeholder words to replace).
 */
export function insertMarkdown(text: string, selection: Selection, action: MarkdownAction): { value: string; cursor: number } {
  const { before, after, lineStart } = WRAPPERS[action];
  const selected = text.slice(selection.start, selection.end);
  const prefix = lineStart && selection.start > 0 && text[selection.start - 1] !== '\n' ? '\n' : '';
  const fragment = `${prefix}${before}${selected}${after}`;
  const insideMarkers = selection.start + prefix.length + before.length;
  return {
    value: text.slice(0, selection.start) + fragment + text.slice(selection.end),
    cursor: selected ? selection.start + fragment.length : insideMarkers,
  };
}
