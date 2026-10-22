'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { TextInput } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { ShippingRate } from '@/lib/types';

export default function AdminShippingPage() {
  const [rates, setRates] = useState<ShippingRate[]>([]);

  useEffect(() => {
    fetch('/api/admin/shipping')
      .then((res) => res.json())
      .then((data) => setRates(data.rates || []));
  }, []);

  async function save(rate: ShippingRate) {
    const response = await fetch(`/api/admin/shipping/${rate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: rate.name, amount: rate.amount, countries: rate.countries }),
    });
    if (!response.ok) {
      showSaveNotice('Could not save rate', 'error');
      return;
    }
    showSaveNotice('Shipping saved');
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminPageHeader title="Shipping" />
      <AdminNav />
      <div className="space-y-4">
        {rates.map((rate, index) => (
          <Card key={rate.id}>
            <TextInput
              label="Name"
              value={rate.name}
              onChange={(e) => setRates((current) => current.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))}
            />
            <TextInput
              className="mt-3"
              label="Amount (HKD)"
              value={rate.amount}
              onChange={(e) => setRates((current) => current.map((row, i) => (i === index ? { ...row, amount: e.target.value } : row)))}
            />
            <div className="mt-4">
              <Button helpKey="admin.shipping.save" onClick={() => save(rate)}>
                Save rates
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
