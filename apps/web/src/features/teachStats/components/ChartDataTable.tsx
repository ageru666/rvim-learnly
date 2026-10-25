interface ChartDataTableProps {
  summary: string;
  headers: [string, string];
  rows: { key: string; label: string; value: string }[];
}

/** The accessible fallback under every chart: the same numbers as a table. */
export function ChartDataTable({ summary, headers, rows }: ChartDataTableProps) {
  return (
    <details>
      <summary className="cursor-pointer text-sm text-text-muted">{summary}</summary>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr>
            <th scope="col" className="text-left">
              {headers[0]}
            </th>
            <th scope="col" className="text-right">
              {headers[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td className="text-right">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
