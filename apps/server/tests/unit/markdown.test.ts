import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../src/lib/markdown.js';

describe('renderMarkdown', () => {
  it('renders GitHub-flavoured Markdown with highlighted code', () => {
    const html = renderMarkdown('# Title\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```js\nconst x = 1;\n```');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<table>');
    expect(html).toContain('hljs');
  });

  it.each([
    ['<script>alert(1)</script>', '<script'],
    ['<img src=x onerror="alert(1)">', 'onerror'],
    ['[click](javascript:alert(1))', 'javascript:'],
    ['<iframe src="https://evil.example"></iframe>', '<iframe'],
  ])('strips dangerous input %s', (input, forbidden) => {
    expect(renderMarkdown(input)).not.toContain(forbidden);
  });

  it('keeps safe links and images', () => {
    const html = renderMarkdown('[docs](https://example.com) ![alt](https://example.com/a.png)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('src="https://example.com/a.png"');
  });
});
