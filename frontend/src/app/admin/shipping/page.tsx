'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import { TextInput } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { ShippingRate } from '@/lib/types';

export default function AdminShippingPage() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ShippingRate | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/shipping')
      .then((res) => (res.ok ? res.json() : { rates: [] }))
      .then((data) => setRates(data.rates || []))
      .catch(() => setRates([]))
      .finally(() => setLoaded(true));
  }, []);

  function update(index: number, patch: Partial<ShippingRate>) {
    setRates((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function save(rate: ShippingRate) {
    setSavingId(rate.id);
    try {
      const response = await fetch(`/api/admin/shipping/${rate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: rate.name, amount: rate.amount, countries: rate.countries }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showSaveNotice(data.error || 'Could not save rate', 'error');
        return;
      }
      if (data.rate) setRates((current) => current.map((row) => (row.id === rate.id ? data.rate : row)));
      showSaveNotice('Shipping saved');
    } catch {
      showSaveNotice('Could not save rate', 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function add() {
    setAdding(true);
    try {
      const response = await fetch('/api/admin/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New option', amount: '0.00', countries: '*' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showSaveNotice(data.error || 'Could not add option', 'error');
        return;
      }
      if (data.rate) setRates((current) => [...current, data.rate]);
      showSaveNotice('Shipping option added');
    } catch {
      showSaveNotice('Could not add option', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/shipping/${pendingDelete.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showSaveNotice(data.error || 'Could not delete option', 'error');
        return;
      }
      setRates((current) => current.filter((row) => row.id !== pendingDelete.id));
      setPendingDelete(null);
      showSaveNotice('Shipping option deleted');
    } catch {
      showSaveNotice('Could not delete option', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="w-full px-6 py-10">
      <AdminPageHeader
        title="Shipping"
        actions={
          <Button helpKey="admin.shipping.add" variant="secondary" disabled={adding} onClick={() => void add()}>
            {adding ? 'Adding…' : 'Add option'}
          </Button>
        }
      />
      {loaded && !rates.length ? (
        <EmptyState>No shipping options yet.</EmptyState>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rates.map((rate, index) => (
            <Card key={rate.id}>
              <div className="grid gap-3 md:grid-cols-3">
              <TextInput label="Name" value={rate.name} onChange={(e) => update(index, { name: e.target.value })} />
              <TextInput
                label="Amount (HKD)"
                value={rate.amount}
                onChange={(e) => update(index, { amount: e.target.value })}
              />
              <TextInput
                label="Countries"
                helpKey="admin.shipping.countries"
                hint="Use * for every country, or codes such as HK."
                value={rate.countries}
                onChange={(e) => update(index, { countries: e.target.value })}
              />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button helpKey="admin.shipping.save" disabled={savingId === rate.id} onClick={() => void save(rate)}>
                  {savingId === rate.id ? 'Saving…' : 'Save rates'}
                </Button>
                <Button
                  helpKey="admin.shipping.delete"
                  variant="danger"
                  aria-label={`Delete ${rate.name || 'option'}`}
                  onClick={() => setPendingDelete(rate)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete shipping option"
        message={pendingDelete ? `Remove “${pendingDelete.name}”? Checkout will no longer offer it.` : ''}
        confirmLabel="Delete"
        confirmHelpKey="admin.confirm.delete"
        cancelHelpKey="admin.confirm.cancel"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
