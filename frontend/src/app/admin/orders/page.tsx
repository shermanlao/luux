'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import HelpButton from '@/components/admin/HelpButton';
import OrderDetailsDialog from '@/components/admin/OrderDetailsDialog';
import type { TrackingDraft } from '@/components/admin/TrackingForm';
import AdminTable from '@/components/ui/AdminTable';
import { formatHkd } from '@shared/slugify';
import type { Order } from '@/lib/types';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const data = await fetch('/api/admin/orders').then((res) => res.json());
    setOrders(data.orders || []);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const selected = orders.find((order) => order.id === selectedId) || null;

  function openOrder(order: Order) {
    setError('');
    setSelectedId(order.id);
  }

  async function update(action: 'fulfill' | 'cancel', tracking?: TrackingDraft) {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/orders/${selected.id}/${action}`, {
        method: 'POST',
        headers: action === 'fulfill' ? { 'Content-Type': 'application/json' } : undefined,
        body: action === 'fulfill' ? JSON.stringify(tracking || {}) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.order) {
        setError(data.error || 'Could not update this order.');
        return;
      }
      const next = data.order as Order;
      setOrders((current) => current.map((order) => (order.id === next.id ? next : order)));
    } catch {
      setError('Could not update this order.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full px-6 py-10">
      <AdminPageHeader title="Orders" />
      <AdminTable columns={['Number', 'Email', 'Status', 'Total']} empty={!orders.length}>
        {orders.map((order) => {
          const open = () => openOrder(order);
          return (
            <tr key={order.id} className="cursor-pointer hover:bg-gray-50">
              {(
                [
                  order.number,
                  order.email,
                  order.status,
                  formatHkd(order.total),
                ] as const
              ).map((value, index) => (
                <td key={index} className="p-0">
                  <HelpButton helpKey="admin.order.open" className="block w-full cursor-pointer px-6 py-3 text-left" onClick={open}>
                    {value}
                  </HelpButton>
                </td>
              ))}
            </tr>
          );
        })}
      </AdminTable>
      <OrderDetailsDialog
        order={selected}
        busy={busy}
        error={error}
        onClose={() => {
          if (busy) return;
          setSelectedId(null);
          setError('');
        }}
        onFulfill={(tracking) => update('fulfill', tracking)}
        onCancel={() => update('cancel')}
      />
    </div>
  );
}
