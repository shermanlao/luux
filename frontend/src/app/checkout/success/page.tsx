'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useCart } from '@/lib/cart';
import { formatHkd } from '@shared/slugify';

function SuccessBody() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const { clear } = useCart();
  const [order, setOrder] = useState<{ number: string; total: string; status: string } | null>(null);

  useEffect(() => {
    clear();
    if (!sessionId) return;
    let stopped = false;
    let attempts = 0;
    async function load() {
      const response = await fetch(`/api/checkout/session/${sessionId}`);
      const data = await response.json().catch(() => ({}));
      if (stopped) return;
      const next = data.order || null;
      setOrder(next);
      if (next && next.status !== 'pending') return;
      attempts += 1;
      if (attempts < 5) window.setTimeout(load, 1500);
    }
    load().catch(() => {
      if (!stopped) setOrder(null);
    });
    return () => {
      stopped = true;
    };
  }, [sessionId, clear]);

  const recorded = order?.status === 'paid' || order?.status === 'fulfilled';

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl">Thank you</h1>
      <p className="mt-3 text-gray-600">
        {recorded
          ? 'Your payment was received.'
          : 'Stripe accepted the checkout. This page shows the order as paid when the shop records it.'}
      </p>
      {order ? (
        <p className="mt-4">
          Order {order.number} — {formatHkd(order.total)} ({order.status})
        </p>
      ) : null}
      <div className="mt-8 flex justify-center gap-3">
        <Button helpKey="nav.home" href="/">
          Home
        </Button>
        <Button helpKey="nav.account" variant="secondary" href="/account">
          Account
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Spinner /></div>}>
      <SuccessBody />
    </Suspense>
  );
}
