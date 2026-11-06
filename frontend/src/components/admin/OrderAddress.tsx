import type { Order } from '@/lib/types';

function cityLine(city?: string, region?: string, postal?: string) {
  return [city, region, postal].filter((part) => part && part.trim()).join(' ');
}

function lines(parts: Array<string | null | undefined>) {
  return parts.filter((line): line is string => Boolean(line && line.trim()));
}

export function invoiceLines(order: Order) {
  return lines([
    order.invoice_name,
    order.invoice_company,
    order.invoice_line1,
    order.invoice_line2,
    cityLine(order.invoice_city, order.invoice_region, order.invoice_postal),
    order.invoice_country,
  ]);
}

export function shippingLines(order: Order) {
  return lines([
    order.shipping_name,
    order.shipping_company,
    order.shipping_line1,
    order.shipping_line2,
    cityLine(order.shipping_city, order.shipping_region, order.shipping_postal),
    order.shipping_country,
  ]);
}

export function shipsToInvoice(order: Order) {
  return order.shipping_same === '1' && invoiceLines(order).length > 0;
}

export function OrderAddressText({ lines: rows }: { lines: string[] }) {
  return (
    <>
      {rows.map((line, index) => (
        <div key={`${index}-${line}`}>{line}</div>
      ))}
    </>
  );
}
