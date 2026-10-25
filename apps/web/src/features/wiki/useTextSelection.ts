import { useEffect, type RefObject } from 'react';
import { useDispatch } from 'react-redux';
import { selectionChanged } from './wikiSlice';
import { normalizeSelection } from './utils';

/** Reports a lookup-sized text selection inside `container` (with its viewport position) to the wiki slice. */
export function useTextSelection(container: RefObject<HTMLElement | null>): void {
  const dispatch = useDispatch();
  useEffect(() => {
    function onSelectionChange() {
      const selection = document.getSelection();
      const node = selection?.anchorNode ?? null;
      const inside = node !== null && container.current?.contains(node) === true;
      const term = inside && selection ? normalizeSelection(selection.toString()) : null;
      if (!term || !selection || selection.rangeCount === 0) {
        dispatch(selectionChanged(null));
        return;
      }
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      dispatch(selectionChanged({ term, at: { x: rect.left + rect.width / 2, y: rect.bottom } }));
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [container, dispatch]);
}
