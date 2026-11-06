'use client';

import { FormEvent, useState } from 'react';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import { TextInput } from '@/components/ui/FormField';
import type { Order } from '@/lib/types';

export default function OrderLookup({
  initialNumber = '',
  onFound,
}: {
  initialNumber?: string;
  onFound: (order: Order) => void;
}) {
  const [number, setNumber] = useState(initialNumber);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/account/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.order) {
        setError(data.error || 'Order not found');
        return;
      }
      onFound(data.order);
    } catch {
      setError('Order not found');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-lg">Find an order</h2>
      {error ? <AlertBanner>{error}</AlertBanner> : null}
      <TextInput label="Order number" required value={number} onChange={(event) => setNumber(event.target.value)} />
      <TextInput label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <Button helpKey="account.track" type="submit" disabled={busy}>
        {busy ? 'Finding…' : 'Find order'}
      </Button>
    </form>
  );
}
