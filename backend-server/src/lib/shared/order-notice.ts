import { COUNTRIES } from './address';
import { formatHkd } from './slugify';

export const ORDER_NOTICE_EMAIL = 'hello@luuxmart.com';

export type OrderNoticeLine = {
  title: string;
  variant_title: string;
  sku: string;
  quantity: number;
  unit_price: string;
};

export type OrderNoticeAddress = {
  name: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  country: string;
};

export type OrderNoticeInput = {
  number: string;
  email: string;
  phone: string;
  subtotal: string;
  shipping_amount: string;
  shipping_rate_name: string;
  total: string;
  shipping_same: string;
  invoice: OrderNoticeAddress;
  shipping: OrderNoticeAddress;
  items: OrderNoticeLine[];
};

function countryName(code: string): string {
  const found = COUNTRIES.find(([value]) => value === code);
  return found ? found[1] : code.trim();
}

function addressLines(address: OrderNoticeAddress): string[] {
  const place = [address.city, address.region, address.postal].map((part) => part.trim()).filter(Boolean).join(', ');
  return [address.name, address.company, address.line1, address.line2, place, countryName(address.country)]
    .map((part) => part.trim())
    .filter(Boolean);
}

function itemLine(item: OrderNoticeLine): string {
  const variant = item.variant_title.trim() && item.variant_title.trim() !== 'Default Title' ? ` (${item.variant_title.trim()})` : '';
  const sku = item.sku.trim() ? ` [${item.sku.trim()}]` : '';
  const quantity = Math.max(1, Number(item.quantity) || 1);
  return `${quantity} × ${item.title.trim()}${variant}${sku} — ${formatHkd(item.unit_price)}`;
}

export function orderNoticeSubject(number: string): string {
  return `New order ${String(number || '').trim()}`.slice(0, 200);
}

export function orderNoticeText(order: OrderNoticeInput): string {
  const lines = [
    `Order ${order.number.trim()} is paid.`,
    '',
    `Email: ${order.email.trim()}`,
  ];
  if (order.phone.trim()) lines.push(`Phone: ${order.phone.trim()}`);
  lines.push('', 'Items');
  const items = order.items.length ? order.items.map(itemLine) : ['(no items)'];
  lines.push(...items);
  lines.push(
    '',
    `Subtotal: ${formatHkd(order.subtotal)}`,
    `Shipping${order.shipping_rate_name.trim() ? ` (${order.shipping_rate_name.trim()})` : ''}: ${formatHkd(order.shipping_amount)}`,
    `Total: ${formatHkd(order.total)}`,
    '',
    'Invoice address',
    ...(addressLines(order.invoice).length ? addressLines(order.invoice) : ['(not provided)'])
  );
  lines.push('', 'Shipping address');
  if (order.shipping_same === '1') {
    lines.push('Same as the invoice address');
  } else {
    const shipping = addressLines(order.shipping);
    lines.push(...(shipping.length ? shipping : ['(not provided)']));
  }
  return lines.join('\n');
}
