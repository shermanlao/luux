'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';

type Inquiry = { id: number; name: string; email: string; message: string; createdAt?: string };

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);

  useEffect(() => {
    fetch('/api/admin/inquiries')
      .then((res) => res.json())
      .then((data) => setInquiries(data.inquiries || []));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeader title="Inquiries" />
      <AdminNav />
      <AdminTable columns={['Name', 'Email', 'Message']} empty={!inquiries.length}>
        {inquiries.map((row) => (
          <tr key={row.id}>
            <td className="px-6 py-3">{row.name}</td>
            <td className="px-6 py-3">{row.email}</td>
            <td className="px-6 py-3">{row.message}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
