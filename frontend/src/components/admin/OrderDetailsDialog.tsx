'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import AdminTable from '@/components/ui/AdminTable';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import { formatHkd } from '@shared/slugify';
import type { Order } from '@/lib/types';

type OrderItem = Order['items'][number];

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-HK', { dateStyle: 'medium', timeStyle: 'short' });
}

function addressLines(order: Order) {
  const city = [order.shipping_city, order.shipping_region, order.shipping_postal].filter(Boolean).join(' ');
  return [order.shipping_name, order.shipping_phone, order.shipping_line1, order.shipping_line2, city, order.shipping_country].filter(
    (line) => line && line.trim()
  );
}

function lineTotal(quantity: number, unitPrice: string) {
  const amount = quantity * Number(unitPrice);
  return Number.isFinite(amount) ? amount : 0;
}

function OrderLine({ item }: { item: OrderItem }) {
  const choices = item.options?.length
    ? item.options
    : item.variant_title && item.variant_title !== 'Default Title'
      ? [{ name: '', value: item.variant_title }]
      : [];
  return (
    <td className="px-6 py-3">
      <div className="flex gap-3">
        {item.image ? <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded object-cover" /> : null}
        <div className="min-w-0">
          <div>{item.title}</div>
          {choices.map((choice) => (
            <div key={`${choice.name}-${choice.value}`} className="text-sm text-gray-500">
              {choice.name ? `${choice.name}: ${choice.value}` : choice.value}
            </div>
          ))}
        </div>
      </div>
    </td>
  );
}

function ProductSpecs({ item }: { item: OrderItem }) {
  if (!item.body_html?.trim()) return null;
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{item.title}</div>
      <div
        className="text-sm text-gray-800 [&_.spec-label]:text-gray-500 [&_.spec-row]:grid [&_.spec-row]:grid-cols-[9rem_minmax(0,1fr)] [&_.spec-row]:gap-x-4 [&_.spec-row]:py-1"
        dangerouslySetInnerHTML={{ __html: item.body_html }}
      />
    </div>
  );
}

export default function OrderDetailsDialog({
  order,
  busy = false,
  error = '',
  onClose,
  onFulfill,
  onCancel,
}: {
  order: Order | null;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onFulfill: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!order) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [order, busy]);

  if (!order || typeof document === 'undefined') return null;

  const placed = formatWhen(order.createdAt);
  const updated = formatWhen(order.updatedAt);
  const address = addressLines(order);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-2xl font-bold">
              {order.number}
            </h2>
            <div className="mt-1 text-sm text-gray-500">
              <div>Placed {placed || 'Unknown'}</div>
              {updated && updated !== placed ? <div>Updated {updated}</div> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {order.status === 'paid' ? (
              <Button helpKey="admin.order.fulfill" variant="secondary" disabled={busy} onClick={onFulfill}>
                Mark fulfilled
              </Button>
            ) : null}
            {order.status === 'pending' || order.status === 'paid' ? (
              <Button helpKey="admin.order.cancel" variant="danger" disabled={busy} onClick={onCancel}>
                Cancel order
              </Button>
            ) : null}
            <Button helpKey="admin.order.close" variant="secondary" disabled={busy} onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        {error ? <AlertBanner className="mb-4">{error}</AlertBanner> : null}
        <AdminTable columns={['Item', 'SKU', 'Qty', 'Price', 'Total']} empty={!order.items?.length}>
          {(order.items || []).map((item) => (
            <tr key={item.id}>
              <OrderLine item={item} />
              <td className="break-all px-6 py-3">{item.sku}</td>
              <td className="px-6 py-3">{item.quantity}</td>
              <td className="px-6 py-3">{formatHkd(item.unit_price)}</td>
              <td className="px-6 py-3">{formatHkd(lineTotal(item.quantity, item.unit_price))}</td>
            </tr>
          ))}
        </AdminTable>
        {(order.items || []).some((item) => item.body_html?.trim()) ? (
          <div className="mt-6 space-y-5">
            <h3 className="text-lg font-semibold">Product details</h3>
            {(order.items || []).map((item) => (
              <ProductSpecs key={item.id} item={item} />
            ))}
          </div>
        ) : null}
        <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
          <div className="space-y-3">
            <div>
              <div className="text-gray-500">Status</div>
              <div>{order.status}</div>
            </div>
            <div>
              <div className="text-gray-500">Email</div>
              <div>{order.email}</div>
            </div>
            <div>
              <div className="text-gray-500">Shipping</div>
              {order.shipping_rate_name ? <div className="text-gray-500">{order.shipping_rate_name}</div> : null}
              {address.length ? (
                address.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
              ) : (
                <div className="text-gray-500">No shipping address.</div>
              )}
            </div>
            {order.notes?.trim() ? (
              <div>
                <div className="text-gray-500">Notes</div>
                <div className="whitespace-pre-wrap">{order.notes}</div>
              </div>
            ) : null}
          </div>
          <div className="space-y-1 sm:pt-6">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatHkd(order.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Shipping</span>
              <span>{formatHkd(order.shipping_amount)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatHkd(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
