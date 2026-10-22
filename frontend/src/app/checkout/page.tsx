'use client';

import { FormEvent, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import { TextInput, SelectField } from '@/components/ui/FormField';
import { useCart } from '@/lib/cart';
import type { ShippingRate } from '@/lib/types';
import { formatHkd } from '@shared/slugify';

export default function CheckoutPage() {
  const { lines, subtotal } = useCart();
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [shippingId, setShippingId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: '',
    shipping_name: '',
    shipping_phone: '',
    shipping_line1: '',
    shipping_line2: '',
    shipping_city: '',
    shipping_region: '',
    shipping_postal: '',
    shipping_country: 'HK',
  });

  useEffect(() => {
    fetch('/api/shipping')
      .then((res) => res.json())
      .then((data) => {
        const list = data.rates || [];
        setRates(list);
        if (list[0]) setShippingId(list[0].id);
      })
      .catch(() => setError('Could not load shipping rates.'));
  }, []);

  const rate = rates.find((row) => row.id === shippingId);
  const total = subtotal + Number(rate?.amount || 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
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
        <TextInput label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextInput label="Full name" required value={form.shipping_name} onChange={(e) => setForm({ ...form, shipping_name: e.target.value })} />
        <TextInput label="Phone" value={form.shipping_phone} onChange={(e) => setForm({ ...form, shipping_phone: e.target.value })} />
        <TextInput label="Address" required value={form.shipping_line1} onChange={(e) => setForm({ ...form, shipping_line1: e.target.value })} />
        <TextInput label="Apartment, suite" value={form.shipping_line2} onChange={(e) => setForm({ ...form, shipping_line2: e.target.value })} />
        <TextInput label="City" required value={form.shipping_city} onChange={(e) => setForm({ ...form, shipping_city: e.target.value })} />
        <TextInput label="Region" value={form.shipping_region} onChange={(e) => setForm({ ...form, shipping_region: e.target.value })} />
        <TextInput label="Postal code" value={form.shipping_postal} onChange={(e) => setForm({ ...form, shipping_postal: e.target.value })} />
        <SelectField
          label="Country"
          value={form.shipping_country}
          onChange={(e) => setForm({ ...form, shipping_country: e.target.value })}
        >
          <option value="HK">Hong Kong SAR</option>
          <option value="CN">China</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
          <option value="SG">Singapore</option>
          <option value="AU">Australia</option>
          <option value="JP">Japan</option>
          <option value="OTHER">Other</option>
        </SelectField>
        <SelectField label="Shipping" value={shippingId} onChange={(e) => setShippingId(Number(e.target.value))}>
          {rates.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} — {formatHkd(row.amount)}
            </option>
          ))}
        </SelectField>
        <Button helpKey="checkout.pay" type="submit" disabled={busy}>
          {busy ? 'Redirecting…' : 'Pay with Stripe'}
        </Button>
      </form>
      <aside className="card-panel h-fit">
        {lines.map((line) => (
          <div key={line.variant_id} className="mb-3 flex justify-between text-sm">
            <span>
              {line.title} × {line.quantity}
            </span>
            <span>{formatHkd(Number(line.price) * line.quantity)}</span>
          </div>
        ))}
        <p className="mt-4 flex justify-between">
          <span>Shipping</span>
          <span>{formatHkd(rate?.amount || 0)}</span>
        </p>
        <p className="mt-2 flex justify-between text-lg font-medium">
          <span>Total</span>
          <span>{formatHkd(total)}</span>
        </p>
      </aside>
    </div>
  );
}
