'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { invoiceLines, OrderAddressText, shippingLines, shipsToInvoice } from '@/components/admin/OrderAddress';
import { formatHkd } from '@shared/slugify';
import type { Order } from '@/lib/types';

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-HK', { dateStyle: 'medium', timeStyle: 'short' });
}

function lineTotal(quantity: number, unitPrice: string) {
  const amount = quantity * Number(unitPrice);
  return Number.isFinite(amount) ? amount : 0;
}

export default function AdminOrderPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/orders/${params.id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data.order) {
          setMissing(true);
          return;
        }
        setOrder(data.order);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function update(action: 'fulfill' | 'cancel') {
    if (!order || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/${action}`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.order) {
        setError(data.error || 'Could not update this order.');
        return;
      }
      setOrder(data.order);
    } catch {
      setError('Could not update this order.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-gray-500">Loading...</div>;
  }

  if (missing || !order) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <AdminPageHeader title="Order" backHref="/admin/orders" backLabel="Back to Orders" />
        <p className="text-gray-500">Order not found.</p>
      </div>
    );
  }

  const placed = formatWhen(order.createdAt);
  const updated = formatWhen(order.updatedAt);
  const invoice = invoiceLines(order);
  const shipping = shippingLines(order);
  const sameAddress = shipsToInvoice(order);
  const actions = (
    <>
      {order.status === 'paid' ? (
        <Button helpKey="admin.order.fulfill" variant="secondary" disabled={busy} onClick={() => update('fulfill')}>
          Mark fulfilled
        </Button>
      ) : null}
      {order.status === 'pending' || order.status === 'paid' ? (
        <Button helpKey="admin.order.cancel" variant="danger" disabled={busy} onClick={() => update('cancel')}>
          Cancel order
        </Button>
      ) : null}
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeader title={order.number} backHref="/admin/orders" backLabel="Back to Orders" actions={actions} />
      <p className="mb-6 text-sm text-gray-500">
        Placed {placed || 'Unknown'}
        {updated && updated !== placed ? ` · Updated ${updated}` : ''}
      </p>
      {error ? <AlertBanner className="mb-6">{error}</AlertBanner> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminTable columns={['Item', 'SKU', 'Qty', 'Price', 'Total']} empty={!order.items.length}>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-3">
                  <div className="flex gap-3">
                    {item.image ? <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded object-cover" /> : null}
                    <div>
                      <div>{item.title}</div>
                      {(item.options?.length
                        ? item.options
                        : item.variant_title && item.variant_title !== 'Default Title'
                          ? [{ name: '', value: item.variant_title }]
                          : []
                      ).map((choice) => (
                        <div key={`${choice.name}-${choice.value}`} className="text-sm text-gray-500">
                          {choice.name ? `${choice.name}: ${choice.value}` : choice.value}
                        </div>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="break-all px-6 py-3">{item.sku}</td>
                <td className="px-6 py-3">{item.quantity}</td>
                <td className="px-6 py-3">{formatHkd(item.unit_price)}</td>
                <td className="px-6 py-3">{formatHkd(lineTotal(item.quantity, item.unit_price))}</td>
              </tr>
            ))}
          </AdminTable>
          {(order.items || []).some((item) => item.body_html?.trim()) ? (
            <div className="mt-6 space-y-5">
              <h2 className="text-lg font-semibold">Product details</h2>
              {order.items.map((item) =>
                item.body_html?.trim() ? (
                  <div key={item.id}>
                    <div className="mb-2 text-sm font-medium">{item.title}</div>
                    <div
                      className="text-sm text-gray-800 [&_.spec-label]:text-gray-500 [&_.spec-row]:grid [&_.spec-row]:grid-cols-[9rem_minmax(0,1fr)] [&_.spec-row]:gap-x-4 [&_.spec-row]:py-1"
                      dangerouslySetInnerHTML={{ __html: item.body_html }}
                    />
                  </div>
                ) : null
              )}
            </div>
          ) : null}
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Order</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd>{order.status}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd>{order.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Contact number</dt>
                <dd>{order.shipping_phone?.trim() || '—'}</dd>
              </div>
              {placed ? (
                <div>
                  <dt className="text-gray-500">Placed</dt>
                  <dd>{placed}</dd>
                </div>
              ) : null}
              {order.notes?.trim() ? (
                <div>
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="whitespace-pre-wrap">{order.notes}</dd>
                </div>
              ) : null}
              {order.stripe_payment_intent ? (
                <div>
                  <dt className="text-gray-500">Stripe payment</dt>
                  <dd className="break-all">{order.stripe_payment_intent}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
          {invoice.length ? (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Invoice address</h2>
              <address className="text-sm not-italic">
                <OrderAddressText lines={invoice} />
              </address>
            </Card>
          ) : null}
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Shipping</h2>
            {order.shipping_rate_name ? <p className="mb-3 text-sm text-gray-500">{order.shipping_rate_name}</p> : null}
            {sameAddress ? (
              <p className="text-sm">Same as invoice address</p>
            ) : shipping.length ? (
              <address className="text-sm not-italic">
                <OrderAddressText lines={shipping} />
              </address>
            ) : (
              <p className="text-sm text-gray-500">No shipping address.</p>
            )}
          </Card>
          <Card>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Subtotal</dt>
                <dd>{formatHkd(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Shipping</dt>
                <dd>{formatHkd(order.shipping_amount)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatHkd(order.total)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
