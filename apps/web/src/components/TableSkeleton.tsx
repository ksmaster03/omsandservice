interface Props {
  rows?: number;
  columns: number;
}

/**
 * Placeholder rows with shimmer animation.
 * Keep the column count matching the real table to preserve layout.
 */
export default function TableSkeleton({ rows = 8, columns }: Props) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-gray-100" aria-hidden="true">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-3 py-3">
              <div
                className="h-3 rounded bg-gray-200 animate-pulse"
                style={{ width: `${40 + ((r * 7 + c * 11) % 50)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
