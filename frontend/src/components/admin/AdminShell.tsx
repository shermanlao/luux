'use client';

import { usePathname } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="flex min-h-[70vh] items-stretch">
      <aside className="w-44 shrink-0 border-r border-gray-200 bg-white sm:w-52">
        <div className="sticky top-0 px-3 py-8 sm:px-4">
          <AdminNav />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
