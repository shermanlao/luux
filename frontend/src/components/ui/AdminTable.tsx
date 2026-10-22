import { ReactNode } from 'react';

export default function AdminTable({
  columns,
  loading,
  empty,
  colSpan,
  children,
}: {
  columns: string[];
  loading?: boolean;
  empty?: boolean;
  colSpan?: number;
  children: ReactNode;
}) {
  const span = colSpan || columns.length;
  return (
    <div className="table-wrap">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {loading ? (
            <tr>
              <td colSpan={span} className="px-6 py-4 text-center text-gray-500">
                Loading...
              </td>
            </tr>
          ) : empty ? (
            <tr>
              <td colSpan={span} className="px-6 py-4 text-center text-gray-500">
                No records found.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
