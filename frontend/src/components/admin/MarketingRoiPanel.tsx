'use client';

import { FormEvent, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { TextInput, SelectField, TextareaField } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';

type SpendRow = {
  id: number;
  spent_on: string;
  spend_type: string;
  channel: string;
  amount_hkd: string;
  note: string;
};

type RoiReport = {
  spend_total: string;
  order_count: number;
  revenue: string;
  revenue_per_spend: string | null;
  gross_profit: string | null;
  gross_profit_per_spend: string | null;
};

function defaultFrom() {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  return { from: start, to: end };
}

export default function MarketingRoiPanel() {
  const [range, setRange] = useState(defaultFrom);
  const [spends, setSpends] = useState<SpendRow[]>([]);
  const [roi, setRoi] = useState<RoiReport | null>(null);
  const [form, setForm] = useState({ spent_on: '', spend_type: 'post', channel: '', amount_hkd: '', note: '' });
  const [busy, setBusy] = useState(false);

  async function reload() {
    const query = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
    const [spendRes, roiRes] = await Promise.all([
      fetch(`/api/admin/marketing-spend?${query}`),
      fetch(`/api/admin/marketing-roi?${query}`),
    ]);
    if (spendRes.ok) {
      const data = await spendRes.json();
      setSpends(data.spends || []);
    }
    if (roiRes.ok) {
      setRoi(await roiRes.json());
    }
  }

  useEffect(() => {
    void reload();
  }, [range.from, range.to]);

  async function addSpend(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/admin/marketing-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save spend.');
      showSaveNotice('Spend saved.');
      setForm({ spent_on: '', spend_type: 'post', channel: '', amount_hkd: '', note: '' });
      await reload();
    } catch (err) {
      showSaveNotice(err instanceof Error ? err.message : 'Could not save spend.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    const response = await fetch(`/api/admin/marketing-spend/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      showSaveNotice('Could not delete spend.', 'error');
      return;
    }
    await reload();
  }

  return (
    <section className="card-panel mt-10 space-y-6">
      <div>
        <h2 className="text-xl font-medium">Marketing spend &amp; ROI</h2>
        <p className="mt-1 text-sm text-gray-600">
          Record what you spent on posts, ads, or site work, then compare paid order revenue in the same date range. Leave COGS and
          actual shipping blank until you have real numbers.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <TextInput label="From" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <TextInput label="To" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      </div>
      {roi ? (
        <RoiStats roi={roi} />
      ) : null}
      <form onSubmit={addSpend} className="grid gap-3 md:grid-cols-2">
        <TextInput label="Date" type="date" required value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} />
        <SelectField label="Type" value={form.spend_type} onChange={(e) => setForm({ ...form, spend_type: e.target.value })}>
          <option value="post">Post</option>
          <option value="ad">Ad</option>
          <option value="other">Other change</option>
        </SelectField>
        <TextInput label="Channel" placeholder="Instagram, Meta ads, …" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
        <TextInput label="Amount (HKD)" required inputMode="decimal" value={form.amount_hkd} onChange={(e) => setForm({ ...form, amount_hkd: e.target.value })} />
        <div className="md:col-span-2">
          <TextareaField label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
        </div>
        <Button helpKey="admin.marketing.spend_add" type="submit" disabled={busy}>
          Add spend
        </Button>
      </form>
      {spends.length ? (
        <table className="admin-table w-full text-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Channel</th>
              <th>HKD</th>
              <th>Note</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {spends.map((row) => (
              <tr key={row.id}>
                <td>{row.spent_on}</td>
                <td>{row.spend_type}</td>
                <td>{row.channel}</td>
                <td>{row.amount_hkd}</td>
                <td className="max-w-xs truncate">{row.note}</td>
                <td>
                  <Button helpKey="admin.marketing.spend_delete" variant="ghost" type="button" onClick={() => void remove(row.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-500">No spend recorded in this range yet.</p>
      )}
    </section>
  );
}

function RoiStats({ roi }: { roi: RoiReport }) {
  const roiLabel =
    roi.revenue_per_spend == null
      ? 'Not calculable (no spend in range)'
      : `Revenue ÷ spend: ${Number(roi.revenue_per_spend).toFixed(2)}×`;
  const profitLabel =
    roi.gross_profit_per_spend == null
      ? roi.gross_profit == null
        ? 'Gross profit ÷ spend: add COGS on variants and/or actual shipping on orders to enable'
        : 'Gross profit ÷ spend: not calculable (no spend in range)'
      : `Gross profit ÷ spend: ${Number(roi.gross_profit_per_spend).toFixed(2)}×`;
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <p>
        <span className="text-gray-500">Spend</span>
        <br />
        <span className="text-lg">HK${roi.spend_total}</span>
      </p>
      <p>
        <span className="text-gray-500">Paid orders</span>
        <br />
        <span className="text-lg">{roi.order_count}</span>
      </p>
      <p>
        <span className="text-gray-500">Revenue</span>
        <br />
        <span className="text-lg">HK${roi.revenue}</span>
      </p>
      <p>
        <span className="text-gray-500">ROI</span>
        <br />
        <span>{roiLabel}</span>
        <br />
        <span className="text-gray-600">{profitLabel}</span>
      </p>
    </div>
  );
}