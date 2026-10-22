'use client';

import { FormEvent, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import AdminTable from '@/components/ui/AdminTable';
import { TextInput } from '@/components/ui/FormField';
import type { Order } from '@/lib/types';
import { formatHkd } from '@shared/slugify';

type Customer = { id: number; email: string; first_name?: string; last_name?: string };

export default function AccountPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' });

  async function refresh() {
    const me = await fetch('/api/account/me').then((res) => (res.ok ? res.json() : { customer: null }));
    setCustomer(me.customer || null);
    if (me.customer) {
      const data = await fetch('/api/account/orders').then((res) => res.json());
      setOrders(data.orders || []);
    }
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const path = mode === 'login' ? '/api/account/login' : '/api/account/register';
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not sign in');
      return;
    }
    await refresh();
  }

  if (customer) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl">Orders</h1>
          <Button
            helpKey="account.logout"
            variant="ghost"
            onClick={async () => {
              await fetch('/api/account/logout', { method: 'POST' });
              setCustomer(null);
              setOrders([]);
            }}
          >
            Log out
          </Button>
        </div>
        <p className="mb-6 text-sm text-gray-600">{customer.email}</p>
        <AdminTable columns={['Order', 'Status', 'Total']} empty={!orders.length}>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-6 py-3">{order.number}</td>
              <td className="px-6 py-3">{order.status}</td>
              <td className="px-6 py-3">{formatHkd(order.total)}</td>
            </tr>
          ))}
        </AdminTable>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-3xl">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      {error ? <AlertBanner>{error}</AlertBanner> : null}
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' ? (
          <>
            <TextInput label="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <TextInput label="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </>
        ) : null}
        <TextInput label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextInput
          label="Password"
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button helpKey={mode === 'login' ? 'account.login' : 'account.register'} type="submit">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
      <button className="mt-4 text-sm underline" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account?' : 'Already have an account?'}
      </button>
    </div>
  );
}
