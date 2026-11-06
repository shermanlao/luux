'use client';

import { FormEvent, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import { TextInput, SelectField } from '@/components/ui/FormField';
import { useHelpTip } from '@/components/admin/HelpButton';
import { copyInvoiceToShipping, EMPTY_ADDRESS, PostalAddressFields, type AddressFields } from '@/components/shop/PostalAddressFields';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import type { ShippingRate } from '@/lib/types';
import { phoneDigits } from '@shared/address';
import { shippingMatchesCountry } from '@shared/shipping';
import { formatHkd } from '@shared/slugify';
import { readShippingId, writeShippingId } from '@/lib/shippingChoice';

type CheckoutForm = AddressFields & {
  email: string;
  phone: string;
  shipping_same: boolean;
};

const EMPTY_FORM: CheckoutForm = {
  email: '',
  phone: '',
  shipping_same: true,
  ...EMPTY_ADDRESS,
};

type Profile = Partial<CheckoutForm> & { first_name?: string; last_name?: string; email?: string };

export default function CheckoutPage() {
  const { lines, subtotal } = useCart();
  const { code, format } = useCurrency();
  const sameTip = useHelpTip('checkout.same_address');
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [shippingId, setShippingId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);

  useEffect(() => {
    fetch('/api/shipping')
      .then((res) => res.json())
      .then((data) => {
        const list = data.rates || [];
        setRates(list);
        const saved = readShippingId();
        const pick = list.find((row: ShippingRate) => row.id === saved) || list[0];
        if (pick) setShippingId(pick.id);
      })
      .catch(() => setError('Could not load shipping rates.'));
  }, []);

  useEffect(() => {
    fetch('/api/account/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const profile = data?.customer as Profile | undefined;
        if (!profile) return;
        setForm((current) => {
          if (current.email || current.phone || current.invoice_first_name || current.invoice_line1) return current;
          const same = profile.shipping_same !== false;
          return {
            ...current,
            email: profile.email || '',
            phone: profile.phone || '',
            shipping_same: same,
            invoice_first_name: profile.invoice_first_name || profile.first_name || '',
            invoice_last_name: profile.invoice_last_name || profile.last_name || '',
            invoice_company: profile.invoice_company || '',
            invoice_line1: profile.invoice_line1 || '',
            invoice_line2: profile.invoice_line2 || '',
            invoice_city: profile.invoice_city || '',
            invoice_region: profile.invoice_region || '',
            invoice_postal: profile.invoice_postal || '',
            invoice_country: profile.invoice_country || 'HK',
            shipping_first_name: same ? profile.invoice_first_name || profile.first_name || '' : profile.shipping_first_name || '',
            shipping_last_name: same ? profile.invoice_last_name || profile.last_name || '' : profile.shipping_last_name || '',
            shipping_company: same ? profile.invoice_company || '' : profile.shipping_company || '',
            shipping_line1: same ? profile.invoice_line1 || '' : profile.shipping_line1 || '',
            shipping_line2: same ? profile.invoice_line2 || '' : profile.shipping_line2 || '',
            shipping_city: same ? profile.invoice_city || '' : profile.shipping_city || '',
            shipping_region: same ? profile.invoice_region || '' : profile.shipping_region || '',
            shipping_postal: same ? profile.invoice_postal || '' : profile.shipping_postal || '',
            shipping_country: same ? profile.invoice_country || 'HK' : profile.shipping_country || 'HK',
          };
        });
      })
      .catch(() => undefined);
  }, []);

  const destinationCountry = form.shipping_same ? form.invoice_country : form.shipping_country;
  const available = rates.filter((row) => shippingMatchesCountry(row.countries, destinationCountry));
  const rate = available.find((row) => row.id === shippingId);
  const total = subtotal + Number(rate?.amount || 0);

  useEffect(() => {
    if (!rates.length) return;
    const nextRates = rates.filter((row) => shippingMatchesCountry(row.countries, destinationCountry));
    if (nextRates.some((row) => row.id === shippingId)) return;
    const next = nextRates[0];
    if (!next) {
      setShippingId('');
      return;
    }
    setShippingId(next.id);
    writeShippingId(next.id);
  }, [rates, destinationCountry, shippingId]);

  function patch(next: Partial<CheckoutForm>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function toggleSame(checked: boolean) {
    setForm((current) => {
      if (!checked && !current.shipping_line1.trim()) {
        return { ...current, shipping_same: false, ...copyInvoiceToShipping(current) };
      }
      return { ...current, shipping_same: checked };
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.phone.trim()) {
      setError('Enter a contact number.');
      return;
    }
    if (phoneDigits(form.phone) < 6) {
      setError('Enter a contact number with at least 6 digits.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          shipping_rate_id: shippingId,
          items: lines.map((line) => ({ variant_id: line.variant_id, quantity: line.quantity })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
      else throw new Error('Stripe did not return a checkout URL. Set STRIPE_SECRET_KEY.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBusy(false);
    }
  }

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <AlertBanner>Your cart is empty.</AlertBanner>
        <Button helpKey="home.shop_now" href="/cart">
          Back to cart
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-3xl">Checkout</h1>
        {error ? <AlertBanner>{error}</AlertBanner> : null}
        <TextInput
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(event) => patch({ email: event.target.value })}
        />
        <TextInput
          label="Contact number"
          type="tel"
          required
          autoComplete="tel"
          value={form.phone}
          onChange={(event) => patch({ phone: event.target.value })}
        />
        <h2 className="pt-2 text-lg">Invoice address</h2>
        <PostalAddressFields kind="invoice" form={form} onChange={patch} />
        <label className="flex items-start gap-2 text-sm" data-help-key="checkout.same_address" title={sameTip || undefined}>
          <input
            type="checkbox"
            className="mt-1"
            checked={form.shipping_same}
            onChange={(event) => toggleSame(event.target.checked)}
          />
          <span>Shipping address is the same as the invoice address</span>
        </label>
        {form.shipping_same ? null : (
          <>
            <h2 className="pt-2 text-lg">Shipping address</h2>
            <PostalAddressFields kind="shipping" form={form} onChange={patch} />
          </>
        )}
        <SelectField
          label="Shipping"
          value={shippingId}
          onChange={(event) => {
            const id = Number(event.target.value);
            setShippingId(id);
            writeShippingId(id);
          }}
        >
          {available.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} — {format(row.amount)}
            </option>
          ))}
        </SelectField>
        {!available.length ? <AlertBanner>No shipping rate covers this country.</AlertBanner> : null}
        <Button helpKey="checkout.pay" type="submit" disabled={busy || !rate}>
          {busy ? 'Redirecting…' : 'Pay with Stripe'}
        </Button>
      </form>
      <aside className="card-panel h-fit">
        {lines.map((line) => (
          <div key={line.variant_id} className="mb-3 flex justify-between text-sm">
            <span>
              {line.title} × {line.quantity}
            </span>
            <span>{format(Number(line.price) * line.quantity)}</span>
          </div>
        ))}
        <p className="mt-4 flex justify-between">
          <span>Shipping</span>
          <span>{format(rate?.amount || 0)}</span>
        </p>
        <p className="mt-2 flex justify-between text-lg font-medium">
          <span>Total</span>
          <span>{format(total)}</span>
        </p>
        {code !== 'HKD' ? (
          <p className="mt-3 text-xs text-gray-500">Card payment is collected in Hong Kong dollars ({formatHkd(total)}).</p>
        ) : null}
      </aside>
    </div>
  );
}
