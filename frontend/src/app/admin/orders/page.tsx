'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';
import Button from '@/components/ui/Button';
import { formatHkd } from '@shared/slugify';
import type { Order } from '@/lib/types';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    const data = await fetch('/api/admin/orders').then((res) => res.json());
    setOrders(data.orders || []);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeader title="Orders" />
      <AdminNav />
      <AdminTable columns={['Number', 'Email', 'Status', 'Total', '']} empty={!orders.length}>
        {orders.map((order) => (
          <tr key={order.id}>
            <td className="px-6 py-3">{order.number}</td>
            <td className="px-6 py-3">{order.email}</td>
            <td className="px-6 py-3">{order.status}</td>
            <td className="px-6 py-3">{formatHkd(order.total)}</td>
            <td className="px-6 py-3">
              <div className="flex gap-2">
                {order.status === 'paid' ? (
                  <Button
                    helpKey="admin.order.fulfill"
                    variant="secondary"
                    onClick={async () => {
                      await fetch(`/api/admin/orders/${order.id}/fulfill`, { method: 'POST' });
                      await load();
                    }}
                  >
                    Mark fulfilled
                  </Button>
                ) : null}
                {order.status === 'pending' || order.status === 'paid' ? (
                  <Button
                    helpKey="admin.order.cancel"
                    variant="danger"
                    onClick={async () => {
                      await fetch(`/api/admin/orders/${order.id}/cancel`, { method: 'POST' });
                      await load();
                    }}
                  >
                    Cancel order
                  </Button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
