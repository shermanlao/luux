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
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', password_confirm: '', first_name: '', last_name: '' });

  async function refresh() {
    const admin = await fetch('/api/admin/me', { cache: 'no-store' });
    if (admin.ok) {
      window.location.replace('/admin');
      return;
    }
    const me = await fetch('/api/account/me', { cache: 'no-store' }).then((res) => (res.ok ? res.json() : { customer: null }));
    setCustomer(me.customer || null);
    if (me.customer) {
      const data = await fetch('/api/account/orders', { cache: 'no-store' }).then((res) => res.json());
      setOrders(data.orders || []);
    }
    setReady(true);
  }

  useEffect(() => {
    refresh().catch(() => setReady(true));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (!oauthError) return;
    setError(oauthError.slice(0, 180));
    params.delete('error');
    const next = params.toString();
    window.history.replaceState(null, '', next ? `/account?${next}` : '/account');
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === 'register' && form.password !== form.password_confirm) {
      setError('Passwords do not match.');
      return;
    }
    const path = mode === 'login' ? '/api/account/login' : '/api/account/register';
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not sign in');
      return;
    }
    if (data.admin) {
      window.location.replace('/admin');
      return;
    }
    await refresh();
  }

  if (!ready) {
    return <div className="py-16 text-center text-gray-600">Loading...</div>;
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
        {mode === 'register' ? (
          <TextInput
            label="Confirm password"
            type="password"
            required
            value={form.password_confirm}
            onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
          />
        ) : null}
        {mode === 'login' ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              helpKey="account.google"
              variant="secondary"
              className="w-full gap-2 px-3"
              onClick={() => {
                window.location.href = '/api/account/oauth/google';
              }}
            >
              <GoogleMark />
              Google
            </Button>
            <Button
              helpKey="account.facebook"
              variant="secondary"
              className="w-full gap-2 px-3"
              onClick={() => {
                window.location.href = '/api/account/oauth/facebook';
              }}
            >
              <FacebookMark />
              Facebook
            </Button>
          </div>
        ) : null}
        <Button helpKey={mode === 'login' ? 'account.login' : 'account.register'} type="submit">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
      <Button
        helpKey={mode === 'login' ? 'account.signup' : 'account.have_account'}
        variant="ghost"
        className="mt-4 p-0 text-sm underline"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'Sign up' : 'Already have an account?'}
      </Button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.4 5.5-6.3 6.9l6.3 5.3C38.2 37.3 44 32 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.95.93-1.95 1.89v2.27h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </svg>
  );
}
