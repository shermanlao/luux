'use client';

import { FormEvent, useState } from 'react';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import { TextInput } from '@/components/ui/FormField';
import { useHelpTip } from '@/components/admin/HelpButton';
import { copyInvoiceToShipping, EMPTY_ADDRESS, PostalAddressFields, type AddressFields } from '@/components/shop/PostalAddressFields';

export type CustomerProfile = AddressFields & {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  shipping_same: boolean;
};

type DetailsForm = AddressFields & {
  first_name: string;
  last_name: string;
  phone: string;
  shipping_same: boolean;
};

function formFromProfile(profile: CustomerProfile): DetailsForm {
  return {
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    phone: profile.phone || '',
    shipping_same: profile.shipping_same !== false,
    ...EMPTY_ADDRESS,
    invoice_first_name: profile.invoice_first_name || '',
    invoice_last_name: profile.invoice_last_name || '',
    invoice_company: profile.invoice_company || '',
    invoice_phone: profile.invoice_phone || '',
    invoice_line1: profile.invoice_line1 || '',
    invoice_line2: profile.invoice_line2 || '',
    invoice_city: profile.invoice_city || '',
    invoice_region: profile.invoice_region || '',
    invoice_postal: profile.invoice_postal || '',
    invoice_country: profile.invoice_country || 'HK',
    shipping_first_name: profile.shipping_first_name || '',
    shipping_last_name: profile.shipping_last_name || '',
    shipping_company: profile.shipping_company || '',
    shipping_phone: profile.shipping_phone || '',
    shipping_line1: profile.shipping_line1 || '',
    shipping_line2: profile.shipping_line2 || '',
    shipping_city: profile.shipping_city || '',
    shipping_region: profile.shipping_region || '',
    shipping_postal: profile.shipping_postal || '',
    shipping_country: profile.shipping_country || 'HK',
  };
}

export default function PersonalDetails({
  profile,
  onSaved,
}: {
  profile: CustomerProfile;
  onSaved: (profile: CustomerProfile) => void;
}) {
  const sameTip = useHelpTip('account.same_address');
  const [form, setForm] = useState<DetailsForm>(() => formFromProfile(profile));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function patch(next: Partial<DetailsForm>) {
    setSaved(false);
    setForm((current) => ({ ...current, ...next }));
  }

  function toggleSame(checked: boolean) {
    setSaved(false);
    setForm((current) => {
      if (!checked && !current.shipping_line1.trim()) {
        return { ...current, shipping_same: false, ...copyInvoiceToShipping(current) };
      }
      return { ...current, shipping_same: checked };
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.customer) {
        setError(data.error || 'Could not save your details.');
        return;
      }
      onSaved(data.customer);
      setForm(formFromProfile(data.customer));
      setSaved(true);
    } catch {
      setError('Could not save your details.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-12 space-y-4">
      <h2 className="text-xl">Personal details</h2>
      <p className="text-sm text-gray-600">{profile.email}</p>
      {error ? <AlertBanner>{error}</AlertBanner> : null}
      {saved ? <p className="text-sm text-gray-600">Saved.</p> : null}
      <TextInput label="First name" autoComplete="given-name" value={form.first_name} onChange={(event) => patch({ first_name: event.target.value })} />
      <TextInput label="Last name" autoComplete="family-name" value={form.last_name} onChange={(event) => patch({ last_name: event.target.value })} />
      <TextInput label="Contact number" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => patch({ phone: event.target.value })} />
      <h3 className="pt-2 text-lg">Invoice address</h3>
      <PostalAddressFields kind="invoice" form={form} onChange={patch} showPhone required={false} />
      <label className="flex items-start gap-2 text-sm" data-help-key="account.same_address" title={sameTip || undefined}>
        <input type="checkbox" className="mt-1" checked={form.shipping_same} onChange={(event) => toggleSame(event.target.checked)} />
        <span>Shipping address is the same as the invoice address</span>
      </label>
      {form.shipping_same ? null : (
        <>
          <h3 className="pt-2 text-lg">Shipping address</h3>
          <PostalAddressFields kind="shipping" form={form} onChange={patch} showPhone required={false} />
        </>
      )}
      <Button helpKey="account.save" type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save details'}
      </Button>
    </form>
  );
}
