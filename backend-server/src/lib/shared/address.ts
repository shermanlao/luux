export const COUNTRIES: Array<[string, string]> = [
  ['HK', 'Hong Kong SAR'],
  ['CN', 'China'],
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['SG', 'Singapore'],
  ['AU', 'Australia'],
  ['JP', 'Japan'],
  ['OTHER', 'Other'],
];

export const PROFILE_COLUMNS = [
  'phone',
  'invoice_first_name',
  'invoice_last_name',
  'invoice_company',
  'invoice_phone',
  'invoice_line1',
  'invoice_line2',
  'invoice_city',
  'invoice_region',
  'invoice_postal',
  'invoice_country',
  'shipping_same',
  'shipping_first_name',
  'shipping_last_name',
  'shipping_company',
  'shipping_phone',
  'shipping_line1',
  'shipping_line2',
  'shipping_city',
  'shipping_region',
  'shipping_postal',
  'shipping_country',
] as const;

export const ORDER_DETAIL_COLUMNS = ['invoice_company', 'shipping_company', 'tracking_carrier', 'tracking_number', 'tracking_url'] as const;

export type PostalInput = {
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  country: string;
};

export function clipText(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

export function phoneDigits(value: string) {
  return value.replace(/\D/g, '').length;
}

export function phoneOk(value: string) {
  const text = value.trim();
  if (!text) return true;
  return phoneDigits(text) >= 6;
}

export function knownCountry(code: string) {
  return COUNTRIES.some(([value]) => value === code);
}

export function personName(address: Pick<PostalInput, 'first_name' | 'last_name'>) {
  return [address.first_name, address.last_name].filter(Boolean).join(' ').trim();
}

export function addressTouched(address: PostalInput) {
  return Boolean(
    address.first_name ||
      address.last_name ||
      address.company ||
      address.phone ||
      address.line1 ||
      address.line2 ||
      address.city ||
      address.region ||
      address.postal
  );
}

export function addressReady(address: PostalInput) {
  return Boolean(personName(address) && address.line1 && address.city && address.country && knownCountry(address.country));
}

export function readPostal(body: Record<string, unknown>, prefix: 'invoice' | 'shipping'): PostalInput {
  const address: PostalInput = {
    first_name: clipText(body[`${prefix}_first_name`], 80),
    last_name: clipText(body[`${prefix}_last_name`], 80),
    company: clipText(body[`${prefix}_company`], 120),
    phone: clipText(body[`${prefix}_phone`], 40),
    line1: clipText(body[`${prefix}_line1`], 200),
    line2: clipText(body[`${prefix}_line2`], 200),
    city: clipText(body[`${prefix}_city`], 80),
    region: clipText(body[`${prefix}_region`], 80),
    postal: clipText(body[`${prefix}_postal`], 20),
    country: clipText(body[`${prefix}_country`], 8).toUpperCase(),
  };
  if (!address.first_name && !address.last_name) {
    const combined = clipText(body[`${prefix}_name`], 120);
    const parts = combined.split(/\s+/).filter(Boolean);
    address.first_name = parts[0] || '';
    address.last_name = parts.slice(1).join(' ');
  }
  return address;
}

export function profileError(input: { phone: string; invoice: PostalInput; shipping: PostalInput; shippingSame: boolean }) {
  if (!phoneOk(input.phone)) return 'Enter a contact number with at least 6 digits.';
  if (!phoneOk(input.invoice.phone)) return 'Enter an invoice phone number with at least 6 digits.';
  if (addressTouched(input.invoice) && !addressReady(input.invoice)) {
    return 'Enter the invoice name, address, city, and country.';
  }
  if (!input.shippingSame) {
    if (!phoneOk(input.shipping.phone)) return 'Enter a shipping phone number with at least 6 digits.';
    if (addressTouched(input.shipping) && !addressReady(input.shipping)) {
      return 'Enter the shipping name, address, city, and country.';
    }
  }
  return null;
}

export function cleanTrackingUrl(value: unknown): string | null {
  const text = clipText(value, 500);
  if (!text) return '';
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return url.toString();
}

export function orderStatusLabel(status: string) {
  if (status === 'pending') return 'Payment pending';
  if (status === 'paid') return 'Paid, preparing to ship';
  if (status === 'fulfilled') return 'Shipped';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}
