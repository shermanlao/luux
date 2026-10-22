'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function AdminHomePage() {
  const [stats, setStats] = useState({ products: 0, orders: 0, paid: 0, inquiries: 0 });

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((res) => res.json())
      .then(setStats)
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeader title="Dashboard" showLogout />
      <AdminNav />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>Products {stats.products}</Card>
        <Card>Orders {stats.orders}</Card>
        <Card>Paid {stats.paid}</Card>
        <Card>Inquiries {stats.inquiries}</Card>
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button helpKey="admin.nav.products" href="/admin/products">
          Products
        </Button>
        <Button helpKey="admin.nav.orders" variant="secondary" href="/admin/orders">
          Orders
        </Button>
        <Button helpKey="admin.nav.settings" variant="secondary" href="/admin/settings">
          Settings
        </Button>
      </div>
    </div>
  );
}
