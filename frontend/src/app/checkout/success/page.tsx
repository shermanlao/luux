'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useCart } from '@/lib/cart';
import type { Order } from '@/lib/types';
import { formatHkd } from '@shared/slugify';

function SuccessBody() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const { clear } = useCart();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    clear();
    if (!sessionId) return;
    fetch(`/api/checkout/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => setOrder(data.order || null))
      .catch(() => setOrder(null));
  }, [sessionId, clear]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl">Thank you</h1>
      <p className="mt-3 text-gray-600">Your payment was received. A confirmation is on its way if email is configured.</p>
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
