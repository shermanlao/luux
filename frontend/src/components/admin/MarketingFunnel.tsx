'use client';

import { useHelpTip } from '@/components/admin/HelpButton';
import type { FunnelReport } from '@shared/marketing-funnel';

export const FUNNEL_RANGES = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '12m', label: '12 months' },
] as const;

export type FunnelRangeId = (typeof FUNNEL_RANGES)[number]['id'];

export function formatPercent(rate: number): string {
  const pct = Math.round(rate * 1000) / 10;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

function money(amount: string, currency: string): string {
  return `${amount} ${currency}`;
}

type Row = {
  key: string;
  label: string;
  channels?: string;
  landings: number;
  product_views: number;
  add_to_carts: number;
  checkout_starts: number;
  orders: number;
  revenue: string;
  conversion_rate: number;
};

function Table({ rows, currency, channel }: { rows: Row[]; currency: string; channel?: boolean }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 pr-3 font-medium">{channel ? 'Channel' : 'Campaign'}</th>
            {channel ? null : <th className="py-2 pr-3 font-medium">Channels</th>}
            <th className="py-2 pr-3 font-medium">Landings</th>
            <th className="py-2 pr-3 font-medium">Product views</th>
            <th className="py-2 pr-3 font-medium">Carts</th>
            <th className="py-2 pr-3 font-medium">Checkouts</th>
            <th className="py-2 pr-3 font-medium">Orders</th>
            <th className="py-2 pr-3 font-medium">Revenue</th>
            <th className="py-2 font-medium">Conversion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100">
              <td className="py-2 pr-3">{row.label}</td>
              {channel ? null : <td className="py-2 pr-3">{row.channels || '—'}</td>}
              <td className="py-2 pr-3">{row.landings}</td>
              <td className="py-2 pr-3">{row.product_views}</td>
              <td className="py-2 pr-3">{row.add_to_carts}</td>
              <td className="py-2 pr-3">{row.checkout_starts}</td>
              <td className="py-2 pr-3">{row.orders}</td>
              <td className="py-2 pr-3">{money(row.revenue, currency)}</td>
              <td className="py-2">{formatPercent(row.conversion_rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MarketingFunnel({
  report,
  range,
  error,
  onRange,
}: {
  report: FunnelReport | null;
  range: FunnelRangeId;
  error: boolean;
  onRange: (range: FunnelRangeId) => void;
}) {
  const rangeTip = useHelpTip('admin.marketing.funnel_range');
  const empty = report
    ? report.totals.landings + report.totals.product_views + report.totals.add_to_carts + report.totals.checkout_starts + report.totals.orders === 0
    : false;
  const currency = report?.totals.currency || 'HKD';
  const campaignRows: Row[] = report
    ? [
        ...report.campaigns.map((row) => ({
          ...row,
          key: row.campaign || String(row.campaign_id || 'campaign'),
          label: row.campaign || (row.campaign_id ? `#${row.campaign_id}` : 'Campaign'),
          channels: row.channels.join(', '),
        })),
        {
          key: 'unattributed',
          label: 'Unattributed',
          channels: '',
          ...report.unattributed,
        },
      ]
    : [];
  const channelRows: Row[] = report
    ? [
        ...report.channels.map((row) => ({
          ...row,
          key: row.source,
        })),
        {
          key: 'unattributed',
          label: 'Unattributed',
          ...report.unattributed,
        },
      ]
    : [];

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Funnel</h2>
          <p className="mt-1 text-sm text-gray-500">
            Landings, product views, carts, checkouts, and paid orders for the range you choose.
            Orders use the last non-direct click within 30 days. Earlier orders can show as unattributed. No customer contact details are shown here.
          </p>
        </div>
        <div className="w-44">
          <label htmlFor="funnel-range" className="admin-field-label">
            Time range
          </label>
          <select
            id="funnel-range"
            className="select-field"
            data-help-key="admin.marketing.funnel_range"
            title={rangeTip || undefined}
            value={range}
            onChange={(event) => onRange(event.target.value as FunnelRangeId)}
          >
            {FUNNEL_RANGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-gray-500">Could not load the funnel.</p>
      ) : !report ? (
        <p className="mt-3 text-sm text-gray-500">Loading the funnel…</p>
      ) : (
        <div className="mt-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border border-gray-200 p-3">
              <p className="text-sm text-gray-500">Landings</p>
              <p className="text-2xl">{report.totals.landings}</p>
            </div>
            <div className="rounded border border-gray-200 p-3">
              <p className="text-sm text-gray-500">Product views</p>
              <p className="text-2xl">{report.totals.product_views}</p>
            </div>
            <div className="rounded border border-gray-200 p-3">
              <p className="text-sm text-gray-500">Add to carts</p>
              <p className="text-2xl">{report.totals.add_to_carts}</p>
            </div>
            <div className="rounded border border-gray-200 p-3">
              <p className="text-sm text-gray-500">Checkout starts</p>
              <p className="text-2xl">{report.totals.checkout_starts}</p>
            </div>
            <div className="rounded border border-gray-200 p-3">
              <p className="text-sm text-gray-500">Paid orders</p>
              <p className="text-2xl">{report.totals.orders}</p>
            </div>
            <div className="rounded border border-gray-200 p-3">
              <p className="text-sm text-gray-500">Paid revenue</p>
              <p className="text-2xl">{money(report.totals.revenue, currency)}</p>
            </div>
            <div className="rounded border border-gray-200 p-3">
              <p className="text-sm text-gray-500">Conversion</p>
              <p className="text-2xl">{formatPercent(report.totals.conversion_rate)}</p>
            </div>
            <div className="rounded border border-gray-200 p-3">
              <p className="text-sm text-gray-500">Average order</p>
              <p className="text-2xl">{report.totals.average_order_value ? money(report.totals.average_order_value, currency) : '—'}</p>
            </div>
          </div>
          {report.totals.landings > 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Product views are {formatPercent(report.totals.product_view_rate)} of landings. Carts are {formatPercent(report.totals.cart_rate)} of product views.
              Checkouts are {formatPercent(report.totals.checkout_rate)} of carts. Orders are {formatPercent(report.totals.purchase_rate)} of checkouts.
            </p>
          ) : null}
          {empty ? <p className="mt-3 text-sm text-gray-500">No funnel events in this range.</p> : null}
          <h3 className="mt-4 text-sm font-medium">By campaign</h3>
          <Table rows={campaignRows} currency={currency} />
          <h3 className="mt-4 text-sm font-medium">By channel</h3>
          <Table rows={channelRows} currency={currency} channel />
        </div>
      )}
    </section>
  );
}
