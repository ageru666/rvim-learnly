import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, type ReactNode } from 'react';
import { Spinner } from './Spinner';

interface VirtualListProps<Item> {
  items: Item[];
  itemKey: (item: Item) => string;
  renderItem: (item: Item) => ReactNode;
  estimateSize: number;
  label: string;
  /** Total number of items on the server, for `aria-rowcount`. */
  total: number;
  hasMore: boolean;
  isFetchingMore: boolean;
  onEndReached: () => void;
  height?: string;
}

const PREFETCH_ROWS = 5;

/**
 * Virtualized list that asks for the next page near the end (guideline §4.2: no hand-rolled
 * pagination for lists that can grow to hundreds of rows).
 */
export function VirtualList<Item>({
  items,
  itemKey,
  renderItem,
  estimateSize,
  label,
  total,
  hasMore,
  isFetchingMore,
  onEndReached,
  height = '70vh',
}: VirtualListProps<Item>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: PREFETCH_ROWS,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = virtualItems.at(-1)?.index ?? -1;

  useEffect(() => {
    if (hasMore && !isFetchingMore && lastIndex >= items.length - PREFETCH_ROWS) onEndReached();
  }, [hasMore, isFetchingMore, lastIndex, items.length, onEndReached]);

  return (
    <div
      ref={scrollRef}
      role="list"
      aria-label={label}
      aria-rowcount={total}
      aria-busy={isFetchingMore || undefined}
      className="overflow-y-auto"
      style={{ maxHeight: height }}
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          if (item === undefined) return null;
          return (
            <div
              key={itemKey(item)}
              role="listitem"
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              {renderItem(item)}
            </div>
          );
        })}
      </div>
      {isFetchingMore && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}
    </div>
  );
}
