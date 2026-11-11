'use client';

const COLORS: Record<string, string> = {
  Human: '#7A9E8F',
  AI: '#8aa0b4',
  'Web scraping': '#c5cdd4',
};

export default function KindChart({ rows }: { rows: Array<{ kind: string; count: number }> }) {
  const peak = Math.max(1, ...rows.map((row) => row.count));
  const label = rows.map((row) => `${row.kind} ${row.count}`).join(', ');

  return (
    <div className="mt-3 space-y-3" role="img" aria-label={label}>
      {rows.map((row) => {
        const width = row.count <= 0 ? 0 : Math.max(1, (row.count / peak) * 100);
        return (
          <div key={row.kind} className="grid grid-cols-[9rem_minmax(0,1fr)_4rem] items-center gap-3 text-sm">
            <span className="text-gray-700">{row.kind}</span>
            <div className="h-7 rounded bg-gray-100">
              <div
                className="h-7 rounded"
                style={{ width: `${width}%`, background: COLORS[row.kind] || '#7A9E8F' }}
              />
            </div>
            <span className="text-right text-gray-900">{row.count}</span>
          </div>
        );
      })}
    </div>
  );
}
