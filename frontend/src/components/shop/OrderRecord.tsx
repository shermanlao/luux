'use client';

import Button from '@/components/ui/Button';
import { invoiceLines, OrderAddressText, shippingLines, shipsToInvoice } from '@/components/admin/OrderAddress';
import { orderStatusLabel } from '@shared/address';
import { formatHkd } from '@shared/slugify';
import type { Order } from '@/lib/types';

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-HK', { dateStyle: 'medium', timeStyle: 'short' });
}

function choiceText(item: Order['items'][number]) {
  if (item.options?.length) return item.options;
  if (item.variant_title && item.variant_title !== 'Default Title') return [{ name: '', value: item.variant_title }];
  return [];
}

export default function OrderRecord({ order }: { order: Order }) {
  const placed = formatWhen(order.createdAt);
  const invoice = invoiceLines(order);
  const shipping = shippingLines(order);
  const sameAddress = shipsToInvoice(order);
  const tracking = Boolean(order.tracking_carrier?.trim() || order.tracking_number?.trim());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl">Order {order.number}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {orderStatusLabel(order.status)}
          {placed ? ` · ${placed}` : ''}
        </p>
      </div>
      {tracking ? (
        <div className="card-panel text-sm">
          <h2 className="mb-2 text-lg">Tracking</h2>
          {order.tracking_carrier?.trim() ? <p>{order.tracking_carrier}</p> : null}
          {order.tracking_number?.trim() ? <p>{order.tracking_number}</p> : null}
          {order.tracking_url?.trim() ? (
            <Button
              helpKey="account.tracking"
              href={order.tracking_url}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              className="mt-3"
            >
              Track shipment
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="card-panel">
        {(order.items || []).map((item) => (
          <div key={item.id} className="mb-4 flex gap-3 text-sm last:mb-0">
            {item.image ? <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded object-cover" /> : null}
            <div className="min-w-0 flex-1">
              <div>{item.title}</div>
              {choiceText(item).map((choice) => (
                <div key={`${choice.name}-${choice.value}`} className="text-gray-500">
                  {choice.name ? `${choice.name}: ${choice.value}` : choice.value}
                </div>
              ))}
              <div className="text-gray-500">Qty {item.quantity}</div>
            </div>
            <div>{formatHkd(Number(item.unit_price) * item.quantity)}</div>
          </div>
        ))}
        <div className="mt-4 space-y-1 border-t border-gray-200 pt-4 text-sm">
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatHkd(order.subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>Shipping{order.shipping_rate_name ? ` · ${order.shipping_rate_name}` : ''}</span>
            <span>{formatHkd(order.shipping_amount)}</span>
          </p>
          <p className="flex justify-between text-base font-medium">
            <span>Total</span>
            <span>{formatHkd(order.total)}</span>
          </p>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {invoice.length ? (
          <div>
            <h2 className="mb-2 text-lg">Invoice address</h2>
            <address className="text-sm not-italic">
              <OrderAddressText lines={invoice} />
            </address>
          </div>
        ) : null}
        <div>
          <h2 className="mb-2 text-lg">Shipping address</h2>
          {sameAddress ? (
            <p className="text-sm">Same as invoice address</p>
          ) : shipping.length ? (
            <address className="text-sm not-italic">
              <OrderAddressText lines={shipping} />
            </address>
          ) : (
            <p className="text-sm text-gray-500">No shipping address.</p>
          )}
        </div>
      </div>
    </div>
  );
}
