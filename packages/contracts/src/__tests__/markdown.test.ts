import { describe, expect, it } from 'vitest';
import { rehypeDemoteHeadings } from '../markdown.js';

describe('rehypeDemoteHeadings', () => {
  it('moves every heading one level down and keeps h6 as the lowest', () => {
    interface Node {
      type: string;
      tagName?: string;
      children?: Node[];
    }
    const tree: Node & { children: Node[] } = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'h1', children: [{ type: 'text' }] },
        { type: 'element', tagName: 'div', children: [{ type: 'element', tagName: 'h5' }] },
        { type: 'element', tagName: 'h6' },
        { type: 'element', tagName: 'header' },
      ],
    };
    rehypeDemoteHeadings()(tree);
    expect(tree.children.map((node) => node.tagName)).toEqual(['h2', 'div', 'h6', 'header']);
    expect(tree.children[1]?.children?.[0]?.tagName).toBe('h6');
  });
});
