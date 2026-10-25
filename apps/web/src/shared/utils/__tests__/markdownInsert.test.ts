import { describe, expect, it } from 'vitest';
import { insertMarkdown } from '../markdownInsert';

describe('insertMarkdown', () => {
  it('wraps the selection and puts the cursor after it', () => {
    expect(insertMarkdown('make this bold', { start: 5, end: 9 }, 'bold')).toEqual({ value: 'make **this** bold', cursor: 13 });
    expect(insertMarkdown('run npm', { start: 4, end: 7 }, 'code').value).toBe('run `npm`');
  });

  it('puts the cursor inside the markers without a selection', () => {
    expect(insertMarkdown('', { start: 0, end: 0 }, 'link')).toEqual({ value: '[](https://)', cursor: 1 });
    expect(insertMarkdown('', { start: 0, end: 0 }, 'image')).toEqual({ value: '![](https://)', cursor: 2 });
  });

  it('starts line syntax on a new line', () => {
    expect(insertMarkdown('Intro', { start: 5, end: 5 }, 'heading')).toEqual({ value: 'Intro\n## ', cursor: 9 });
    expect(insertMarkdown('Intro\n', { start: 6, end: 6 }, 'list').value).toBe('Intro\n- ');
    expect(insertMarkdown('', { start: 0, end: 0 }, 'list').value).toBe('- ');
  });
});
