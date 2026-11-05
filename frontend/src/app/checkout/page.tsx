'use client';

import { FormEvent, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import { TextInput, SelectField } from '@/components/ui/FormField';
import { useHelpTip } from '@/components/admin/HelpButton';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import type { ShippingRate } from '@/lib/types';
import { shippingMatchesCountry } from '@shared/shipping';
import { formatHkd } from '@shared/slugify';
import { readShippingId, writeShippingId } from '@/lib/shippingChoice';

const COUNTRIES: Array<[string, string]> = [
  ['HK', 'Hong Kong SAR'],
  ['CN', 'China'],
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['SG', 'Singapore'],
  ['AU', 'Australia'],
  ['JP', 'Japan'],
  ['OTHER', 'Other'],
];

type AddressKind = 'invoice' | 'shipping';

type CheckoutForm = {
  email: string;
  phone: string;
  shipping_same: boolean;
  invoice_name: string;
  invoice_line1: string;
  invoice_line2: string;
  invoice_city: string;
  invoice_region: string;
  invoice_postal: string;
  invoice_country: string;
  shipping_name: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_region: string;
  shipping_postal: string;
  shipping_country: string;
};

const EMPTY_FORM: CheckoutForm = {
  email: '',
  phone: '',
  shipping_same: true,
  invoice_name: '',
  invoice_line1: '',
  invoice_line2: '',
  invoice_city: '',
  invoice_region: '',
  invoice_postal: '',
  invoice_country: 'HK',
  shipping_name: '',
  shipping_line1: '',
  shipping_line2: '',
  shipping_city: '',
  shipping_region: '',
  shipping_postal: '',
  shipping_country: 'HK',
};

function digitCount(value: string) {
  return value.replace(/\D/g, '').length;
}

function AddressFields({
  kind,
  form,
  onChange,
}: {
  kind: AddressKind;
  form: CheckoutForm;
  onChange: (patch: Partial<CheckoutForm>) => void;
}) {
  const auto = kind === 'invoice' ? 'billing' : 'shipping';
  const nameKey = `${kind}_name` as const;
  const line1Key = `${kind}_line1` as const;
  const line2Key = `${kind}_line2` as const;
  const cityKey = `${kind}_city` as const;
  const regionKey = `${kind}_region` as const;
  const postalKey = `${kind}_postal` as const;
  const countryKey = `${kind}_country` as const;
  return (
    <>
      <TextInput
        label="Name"
        required
        autoComplete={`${auto} name`}
        value={form[nameKey]}
        onChange={(event) => onChange({ [nameKey]: event.target.value })}
      />
      <TextInput
        label="Address"
        required
        autoComplete={`${auto} address-line1`}
        value={form[line1Key]}
        onChange={(event) => onChange({ [line1Key]: event.target.value })}
      />
      <TextInput
        label="Apartment, suite"
        autoComplete={`${auto} address-line2`}
        value={form[line2Key]}
        onChange={(event) => onChange({ [line2Key]: event.target.value })}
      />
      <TextInput
        label="City"
        required
        autoComplete={`${auto} address-level2`}
        value={form[cityKey]}
        onChange={(event) => onChange({ [cityKey]: event.target.value })}
      />
      <TextInput
        label="Region"
        autoComplete={`${auto} address-level1`}
        value={form[regionKey]}
        onChange={(event) => onChange({ [regionKey]: event.target.value })}
      />
      <TextInput
        label="Postal code"
        autoComplete={`${auto} postal-code`}
        value={form[postalKey]}
        onChange={(event) => onChange({ [postalKey]: event.target.value })}
      />
      <SelectField
        label="Country"
        autoComplete={`${auto} country`}
        value={form[countryKey]}
        onChange={(event) => onChange({ [countryKey]: event.target.value })}
      >
        {COUNTRIES.map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </SelectField>
    </>
  );
}

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
        const email = String(data?.customer?.email || '').trim();
        const name = [data?.customer?.first_name, data?.customer?.last_name].filter(Boolean).join(' ').trim();
        if (!email && !name) return;
        setForm((current) => ({
          ...current,
          email: current.email || email,
          invoice_name: current.invoice_name || name,
        }));
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
        return {
          ...current,
          shipping_same: false,
          shipping_name: current.invoice_name,
          shipping_line1: current.invoice_line1,
          shipping_line2: current.invoice_line2,
          shipping_city: current.invoice_city,
          shipping_region: current.invoice_region,
          shipping_postal: current.invoice_postal,
          shipping_country: current.invoice_country,
        };
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
    if (digitCount(form.phone) < 6) {
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
        <AddressFields kind="invoice" form={form} onChange={patch} />
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
            <AddressFields kind="shipping" form={form} onChange={patch} />
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
