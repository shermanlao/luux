import Customer from '../models/Customer';
import { clipText, personName, profileError, readPostal, type PostalInput } from './shared/address';

export type CheckoutProfile = {
  phone: string;
  invoice: PostalInput;
  shipping: PostalInput;
  shippingSame: boolean;
};

function assignPostal(customer: Customer, prefix: 'invoice' | 'shipping', address: PostalInput) {
  customer.set(`${prefix}_first_name`, address.first_name);
  customer.set(`${prefix}_last_name`, address.last_name);
  customer.set(`${prefix}_company`, address.company);
  customer.set(`${prefix}_phone`, address.phone);
  customer.set(`${prefix}_line1`, address.line1);
  customer.set(`${prefix}_line2`, address.line2);
  customer.set(`${prefix}_city`, address.city);
  customer.set(`${prefix}_region`, address.region);
  customer.set(`${prefix}_postal`, address.postal);
  customer.set(`${prefix}_country`, address.country);
}

export function readCheckoutProfile(body: Record<string, unknown>): CheckoutProfile & { email: string } {
  const phone = clipText(body.phone ?? body.shipping_phone, 40);
  const invoice = readPostal(body, 'invoice');
  invoice.phone = invoice.phone || phone;
  const shippingSame = body.shipping_same !== false && body.shipping_same !== 0 && body.shipping_same !== '0' && body.shipping_same !== 'false';
  const shipping = shippingSame ? { ...invoice } : readPostal(body, 'shipping');
  if (!shipping.phone) shipping.phone = phone;
  return {
    email: String(body.email || '').trim().toLowerCase(),
    phone,
    invoice,
    shipping,
    shippingSame,
  };
}

export function applyCheckoutProfile(customer: Customer, profile: CheckoutProfile) {
  customer.phone = profile.phone;
  customer.first_name = profile.invoice.first_name;
  customer.last_name = profile.invoice.last_name;
  customer.shipping_same = profile.shippingSame ? '1' : '0';
  assignPostal(customer, 'invoice', profile.invoice);
  assignPostal(customer, 'shipping', profile.shippingSame ? profile.invoice : profile.shipping);
}

export function readAccountProfile(body: Record<string, unknown>) {
  const phone = clipText(body.phone, 40);
  const invoice = readPostal(body, 'invoice');
  const shippingSame = body.shipping_same !== false && body.shipping_same !== 0 && body.shipping_same !== '0' && body.shipping_same !== 'false';
  const shipping = shippingSame ? { ...invoice } : readPostal(body, 'shipping');
  return {
    first_name: clipText(body.first_name, 80),
    last_name: clipText(body.last_name, 80),
    phone,
    invoice,
    shipping,
    shippingSame,
    error: profileError({ phone, invoice, shipping, shippingSame }),
  };
}

export function applyAccountProfile(customer: Customer, profile: ReturnType<typeof readAccountProfile>) {
  customer.first_name = profile.first_name;
  customer.last_name = profile.last_name;
  customer.phone = profile.phone;
  customer.shipping_same = profile.shippingSame ? '1' : '0';
  assignPostal(customer, 'invoice', profile.invoice);
  assignPostal(customer, 'shipping', profile.shipping);
}

export function postalFromCustomer(customer: Customer, prefix: 'invoice' | 'shipping'): PostalInput {
  return {
    first_name: String(customer.get(`${prefix}_first_name`) || ''),
    last_name: String(customer.get(`${prefix}_last_name`) || ''),
    company: String(customer.get(`${prefix}_company`) || ''),
    phone: String(customer.get(`${prefix}_phone`) || ''),
    line1: String(customer.get(`${prefix}_line1`) || ''),
    line2: String(customer.get(`${prefix}_line2`) || ''),
    city: String(customer.get(`${prefix}_city`) || ''),
    region: String(customer.get(`${prefix}_region`) || ''),
    postal: String(customer.get(`${prefix}_postal`) || ''),
    country: String(customer.get(`${prefix}_country`) || ''),
  };
}

export function serializeCustomer(customer: Customer) {
  const invoice = postalFromCustomer(customer, 'invoice');
  const shipping = postalFromCustomer(customer, 'shipping');
  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name || '',
    last_name: customer.last_name || '',
    phone: customer.phone || '',
    shipping_same: (customer.shipping_same || '1') !== '0',
    invoice_first_name: invoice.first_name,
    invoice_last_name: invoice.last_name,
    invoice_company: invoice.company,
    invoice_phone: invoice.phone,
    invoice_line1: invoice.line1,
    invoice_line2: invoice.line2,
    invoice_city: invoice.city,
    invoice_region: invoice.region,
    invoice_postal: invoice.postal,
    invoice_country: invoice.country || 'HK',
    shipping_first_name: shipping.first_name,
    shipping_last_name: shipping.last_name,
    shipping_company: shipping.company,
    shipping_phone: shipping.phone,
    shipping_line1: shipping.line1,
    shipping_line2: shipping.line2,
    shipping_city: shipping.city,
    shipping_region: shipping.region,
    shipping_postal: shipping.postal,
    shipping_country: shipping.country || 'HK',
  };
}

export function orderAddressColumns(prefix: 'invoice' | 'shipping', address: PostalInput) {
  return {
    [`${prefix}_name`]: personName(address),
    [`${prefix}_company`]: address.company,
    [`${prefix}_line1`]: address.line1,
    [`${prefix}_line2`]: address.line2,
    [`${prefix}_city`]: address.city,
    [`${prefix}_region`]: address.region,
    [`${prefix}_postal`]: address.postal,
    [`${prefix}_country`]: address.country,
  };
}
