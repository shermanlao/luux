'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import OrderLookup from '@/components/shop/OrderLookup';
import OrderRecord from '@/components/shop/OrderRecord';
import type { Order } from '@/lib/types';

export default function CustomerOrderPage() {
  const params = useParams<{ number: string }>();
  const number = decodeURIComponent(params.number || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/account/orders/${encodeURIComponent(number)}`, { cache: 'no-store' })
      .then(async (response) => {
        if (cancelled) return;
        setSignedIn(response.status !== 401);
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.order) setOrder(data.order);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [number]);

  if (!ready) {
    return <div className="py-16 text-center text-gray-600">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button helpKey="nav.account" variant="ghost" className="mb-6 p-0 text-sm underline" href="/account">
        Account
      </Button>
      {order ? (
        <OrderRecord order={order} />
      ) : (
        <div className="mx-auto max-w-md">
          {signedIn ? <p className="mb-6 text-sm text-gray-600">Order not found.</p> : null}
          <OrderLookup initialNumber={number} onFound={setOrder} />
        </div>
      )}
    </div>
  );
}
