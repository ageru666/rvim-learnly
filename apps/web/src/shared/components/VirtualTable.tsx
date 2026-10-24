import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import { Spinner } from './Spinner';
import type { TableColumn } from './Table';

interface VirtualTableProps<Row> {
  caption: string;
  columns: TableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  rowHeight: number;
  total: number;
  hasMore: boolean;
  isFetchingMore: boolean;
  onEndReached: () => void;
  height?: string;
}

const PREFETCH_ROWS = 5;

/** A table with virtualized rows and infinite loading (guideline §4.2). */
export function VirtualTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  rowHeight,
  total,
  hasMore,
  isFetchingMore,
  onEndReached,
  height = '70vh',
}: VirtualTableProps<Row>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: PREFETCH_ROWS,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const lastIndex = virtualRows.at(-1)?.index ?? -1;
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = virtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0);

  useEffect(() => {
    if (hasMore && !isFetchingMore && lastIndex >= rows.length - PREFETCH_ROWS) onEndReached();
  }, [hasMore, isFetchingMore, lastIndex, rows.length, onEndReached]);

  return (
    <div ref={scrollRef} className="card overflow-auto" style={{ maxHeight: height }} aria-busy={isFetchingMore || undefined}>
      <table className="w-full border-collapse text-sm" aria-rowcount={total + 1}>
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-10 bg-surface-sunken text-left text-text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-4 py-3 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paddingTop > 0 && <tr aria-hidden style={{ height: paddingTop }} />}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (row === undefined) return null;
            return (
              <tr key={rowKey(row)} aria-rowindex={virtualRow.index + 2} className="border-t border-border" style={{ height: rowHeight }}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className ?? 'px-4 py-2'}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 && <tr aria-hidden style={{ height: paddingBottom }} />}
        </tbody>
      </table>
      {isFetchingMore && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}
    </div>
  );
}
