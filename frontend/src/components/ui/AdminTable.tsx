'use client';

import { ReactNode } from 'react';
import HelpButton from '@/components/admin/HelpButton';

export type AdminTableColumn =
  | string
  | {
      id: string;
      label: string;
      helpKey?: string;
      sorted?: 'asc' | 'desc';
      onSort?: () => void;
    };

const HEADER_CLASS = 'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500';

function columnId(column: AdminTableColumn, index: number) {
  return typeof column === 'string' ? `${column}-${index}` : column.id;
}

function SortMark({ dir }: { dir?: 'asc' | 'desc' }) {
  return (
    <span aria-hidden="true" className="inline-flex flex-col text-[9px] leading-[9px]">
      <span className={dir === 'asc' ? 'text-gray-900' : 'text-gray-300'}>▲</span>
      <span className={dir === 'desc' ? 'text-gray-900' : 'text-gray-300'}>▼</span>
    </span>
  );
}

function SortHeader({ column }: { column: Exclude<AdminTableColumn, string> }) {
  const active = column.sorted === 'asc' || column.sorted === 'desc';
  return (
    <th
      className={HEADER_CLASS}
      aria-sort={column.sorted === 'asc' ? 'ascending' : column.sorted === 'desc' ? 'descending' : 'none'}
    >
      <HelpButton
        helpKey={column.helpKey || 'admin.product.sort'}
        className={`inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-gray-900 ${active ? 'text-gray-900' : ''}`}
        onClick={column.onSort}
      >
        {column.label}
        <SortMark dir={column.sorted} />
      </HelpButton>
    </th>
  );
}

export default function AdminTable({
  columns,
  loading,
  empty,
  colSpan,
  children,
}: {
  columns: AdminTableColumn[];
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
            {columns.map((column, index) =>
              typeof column === 'string' ? (
                <th key={columnId(column, index)} className={HEADER_CLASS}>
                  {column}
                </th>
              ) : column.onSort ? (
                <SortHeader key={column.id} column={column} />
              ) : (
                <th key={column.id} className={HEADER_CLASS}>
                  {column.label}
                </th>
              )
            )}
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
