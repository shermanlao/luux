'use client';

import { useRef } from 'react';
import { useHelpTip } from '@/components/admin/HelpButton';
import { useElementSize } from '@/components/admin/useElementSize';
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

const FUNNEL_STEPS = [
  { key: 'landings', label: 'Landings', pick: (report: FunnelReport) => report.totals.landings },
  { key: 'product_views', label: 'Product views', pick: (report: FunnelReport) => report.totals.product_views },
  { key: 'add_to_carts', label: 'Add to cart', pick: (report: FunnelReport) => report.totals.add_to_carts },
  { key: 'checkout_starts', label: 'Checkout', pick: (report: FunnelReport) => report.totals.checkout_starts },
  { key: 'orders', label: 'Paid orders', pick: (report: FunnelReport) => report.totals.orders },
] as const;

const FUNNEL_FILLS = ['#d7ebe4', '#b7d6c9', '#8fb5a3', '#6a9484', '#3e6154'];
const FUNNEL_INK = ['#1f2937', '#1f2937', '#111827', '#ffffff', '#ffffff'];

function continued(current: number, previous: number): string {
  if (previous <= 0) return '—';
  return formatPercent(current / previous);
}

const FUNNEL_HEIGHT = 280;
const FUNNEL_FRACTIONS = [1, 0.82, 0.64, 0.46, 0.3, 0.16];

function FunnelShape({ report }: { report: FunnelReport }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(boxRef);
  const height = FUNNEL_HEIGHT;
  const steps = FUNNEL_STEPS.map((step) => ({ ...step, count: step.pick(report) }));
  const summary = steps.map((step) => `${step.label} ${step.count}`).join(', ');
  const side = width >= 520 ? 'full' : width >= 360 ? 'short' : 'none';
  const gutter = side === 'full' ? 132 : side === 'short' ? 64 : 8;
  const padL = 4;
  const top = 4;
  const bottom = 4;
  const gap = 6;
  const band = (height - top - bottom - gap * (steps.length - 1)) / steps.length;
  const plotW = Math.max(48, width - padL - gutter);
  const center = padL + plotW / 2;
  const halves = FUNNEL_FRACTIONS.map((fraction) => (plotW / 2) * fraction);

  return (
    <div ref={boxRef} className="h-[280px] w-full">
      {width > 0 ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-[280px] w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Funnel. ${summary}.`}
        >
          {steps.map((step, index) => {
            const y0 = top + index * (band + gap);
            const y1 = y0 + band;
            const upper = halves[index];
            const lower = halves[index + 1];
            const previous = index === 0 ? step.count : steps[index - 1].count;
            const rate = index === 0 ? '' : continued(step.count, previous);
            const showRate = Boolean(rate && rate !== '—' && side !== 'none');
            return (
              <g key={step.key}>
                <polygon
                  points={`${center - upper},${y0} ${center + upper},${y0} ${center + lower},${y1} ${center - lower},${y1}`}
                  fill={FUNNEL_FILLS[index]}
                />
                <text x={center} y={y0 + 18} textAnchor="middle" fontSize="13" fill={FUNNEL_INK[index]}>
                  {step.label}
                </text>
                <text x={center} y={y0 + 40} textAnchor="middle" fontSize="18" fontWeight="600" fill={FUNNEL_INK[index]}>
                  {step.count}
                </text>
                {showRate ? (
                  <text x={center + upper + 10} y={y0 + band * 0.55} fontSize="12" fill="#6b7280">
                    {side === 'full' ? `${rate} continued` : rate}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : null}
    </div>
  );
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
            Each stage is a narrower slice of the one above it. Orders use the last non-direct click within 30 days.
            Earlier orders can show as unattributed. AI crawlers and web scrapers are left out, because they do not add to the cart or pay.
            No customer contact details are shown here.
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
          <div className="grid items-center gap-6 xl:grid-cols-[minmax(0,1.4fr)_18rem]">
            <FunnelShape report={report} />
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
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
          </div>
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
