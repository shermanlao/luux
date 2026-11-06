'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useHelpTip } from '@/components/admin/HelpButton';
import VisitorChart, { type VisitorPoint } from '@/components/admin/VisitorChart';
import Button from '@/components/ui/Button';
import { TextareaField, TextInput } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';

const CHANNELS = ['facebook', 'instagram', 'threads', 'pinterest'] as const;
type Channel = (typeof CHANNELS)[number];

type Result = { channel: Channel; status: 'posted' | 'failed'; external_id: string; error: string };
type Analysis = { summary: string; findings: string[] };
type Draft = {
  id: number;
  status: 'draft' | 'posted' | 'failed';
  caption: string;
  image_url: string;
  link: string;
  channels: Channel[];
  rationale: string;
  results: Result[];
  analysis: Analysis;
};

const VISITOR_KINDS = ['Human', 'AI', 'Web scraping'] as const;
const VISITOR_RANGES = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '12m', label: '12 months' },
] as const;
type VisitorRangeId = (typeof VISITOR_RANGES)[number]['id'];
type VisitorSeries = { range: VisitorRangeId; bucket: 'day' | 'month'; points: VisitorPoint[] };

type Overview = {
  views: number;
  average_stay_seconds: number;
  kinds: Array<{ kind: string; count: number }>;
  countries: Array<{ country: string; count: number }>;
  sources: Array<{ source: string; count: number }>;
  top_paths: Array<{ path: string; count: number; stay_seconds: number }>;
  paid_total: string;
  paid_count: number;
  connected: Record<Channel, boolean>;
  campaigns: Array<{ analysis: Analysis; campaigns: Array<Omit<Draft, 'analysis'>> }>;
};

function formatStay(seconds: number): string {
  if (!seconds) return 'Not yet';
  const mins = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (mins <= 0) return `${rest} sec`;
  if (!rest) return `${mins} min`;
  return `${mins} min ${rest} sec`;
}

function cardsFrom(overview: Overview): Draft[] {
  return overview.campaigns.flatMap((document) =>
    document.campaigns.map((campaign) => ({ ...campaign, analysis: document.analysis }))
  );
}

export default function AdminMarketingPage() {
  const [views, setViews] = useState(0);
  const [kinds, setKinds] = useState<Overview['kinds']>(VISITOR_KINDS.map((kind) => ({ kind, count: 0 })));
  const [averageStay, setAverageStay] = useState(0);
  const [countries, setCountries] = useState<Overview['countries']>([]);
  const [sources, setSources] = useState<Overview['sources']>([]);
  const [paidTotal, setPaidTotal] = useState('0.00');
  const [paidCount, setPaidCount] = useState(0);
  const [topPaths, setTopPaths] = useState<Overview['top_paths']>([]);
  const [range, setRange] = useState<VisitorRangeId>('30d');
  const [series, setSeries] = useState<VisitorSeries | null>(null);
  const [seriesError, setSeriesError] = useState(false);
  const rangeTip = useHelpTip('admin.marketing.range');
  const [connected, setConnected] = useState<Record<Channel, boolean>>({
    facebook: false,
    instagram: false,
    threads: false,
    pinterest: false,
  });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    fetch('/api/marketing/v1/overview')
      .then((res) => res.json())
      .then((data: Overview) => {
        setViews(data.views || 0);
        const counts = new Map((data.kinds || []).map((row) => [row.kind, row.count]));
        setKinds(VISITOR_KINDS.map((kind) => ({ kind, count: counts.get(kind) || 0 })));
        setAverageStay(data.average_stay_seconds || 0);
        setCountries(data.countries || []);
        setSources(data.sources || []);
        setPaidTotal(data.paid_total || '0.00');
        setPaidCount(data.paid_count || 0);
        setTopPaths(data.top_paths || []);
        setConnected(data.connected || { facebook: false, instagram: false, threads: false, pinterest: false });
        setDrafts(cardsFrom(data));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSeriesError(false);
    fetch(`/api/marketing/v1/visitors?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data: VisitorSeries) => {
        if (!cancelled) setSeries(data);
      })
      .catch(() => {
        if (!cancelled) setSeriesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  function update(id: number, patch: Partial<Draft>) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  async function ask() {
    setBusy('ask');
    const response = await fetch('/api/marketing/v1/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: 'luux' }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy('');
    if (!response.ok) {
      showSaveNotice(data.error || 'Could not draft a campaign', 'error');
      return;
    }
    const created = cardsFrom({ campaigns: [data] } as Overview);
    setDrafts((current) => [...created, ...current]);
    showSaveNotice('Draft ready');
  }

  async function save(draft: Draft) {
    setBusy(`save-${draft.id}`);
    const response = await fetch(`/api/marketing/v1/drafts/${draft.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: draft.caption,
        image_url: draft.image_url,
        link: draft.link,
        channels: draft.channels.filter((channel) => connected[channel]),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy('');
    if (!response.ok) {
      showSaveNotice(data.error || 'Could not save the draft', 'error');
      return;
    }
    const saved = cardsFrom({ campaigns: [data] } as Overview)[0];
    if (saved) update(draft.id, saved);
    showSaveNotice('Draft saved');
  }

  async function confirm(draft: Draft) {
    setBusy(`post-${draft.id}`);
    const response = await fetch(`/api/marketing/v1/drafts/${draft.id}/publish`, { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    setBusy('');
    if (!response.ok) {
      showSaveNotice(data.error || 'Could not post', 'error');
      return;
    }
    const posted = cardsFrom({ campaigns: [data] } as Overview)[0];
    if (posted) update(draft.id, posted);
    const failed = posted?.results.find((item) => item.status === 'failed');
    showSaveNotice(failed ? failed.error || 'A channel did not post' : 'Posted', failed ? 'error' : 'success');
  }

  function exportDraft(draft: Draft) {
    const document = {
      app: 'luux',
      analysis: draft.analysis,
      campaigns: [
        {
          id: draft.id,
          status: draft.status,
          caption: draft.caption,
          image_url: draft.image_url,
          link: draft.link,
          channels: draft.channels,
          rationale: draft.rationale,
          results: draft.results,
        },
      ],
    };
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `campaign-${draft.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminPageHeader title="Marketing" />
      <p className="text-sm text-gray-600">Last 30 days. Page views include browsers, AI crawlers, and other automated fetching. Country, source, and time on a page count browsers only. The address itself is not stored. Nothing posts until you confirm.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-gray-200 p-3">
          <p className="text-sm text-gray-500">Page views</p>
          <p className="text-2xl">{views}</p>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <p className="text-sm text-gray-500">Average stay</p>
          <p className="text-2xl">{formatStay(averageStay)}</p>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <p className="text-sm text-gray-500">Paid orders</p>
          <p className="text-2xl">{paidCount}</p>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <p className="text-sm text-gray-500">Paid total</p>
          <p className="text-2xl">{paidTotal}</p>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Visitors over time</h2>
          <p className="mt-1 text-sm text-gray-500">
            Page views for the range you choose. Quiet days stay on the chart as zero.
            {range === '12m' ? ' Each point is one month.' : ' Each point is one day.'}
          </p>
        </div>
        <div className="w-44">
          <label htmlFor="visitor-range" className="admin-field-label">
            Time range
          </label>
          <select
            id="visitor-range"
            className="select-field"
            data-help-key="admin.marketing.range"
            title={rangeTip || undefined}
            value={range}
            onChange={(event) => setRange(event.target.value as VisitorRangeId)}
          >
            {VISITOR_RANGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {series?.range === range ? (
        <div className="mt-3 rounded border border-gray-200 p-3">
          <VisitorChart points={series.points} />
          <p className="mt-1 text-sm text-gray-500">
            {series.points.reduce((sum, point) => sum + point.views, 0)} page views
          </p>
        </div>
      ) : seriesError ? (
        <p className="mt-3 text-sm text-gray-500">Could not load the chart.</p>
      ) : (
        <p className="mt-3 text-sm text-gray-500">Loading the chart…</p>
      )}
      <h2 className="mt-6 text-sm font-medium">Who visited</h2>
      <p className="mt-1 text-sm text-gray-500">Human is a normal browser. AI is a known assistant or model crawler. Web scraping is other automated fetching, including search crawlers and scripts. The label is the browser name on the request, and that name is not stored. Earlier views are not included.</p>
      <ul className="mt-2 space-y-1 text-sm">
        {kinds.map((row) => (
          <li key={row.kind} className="flex justify-between gap-4">
            <span>{row.kind}</span>
            <span>{row.count}</span>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 text-sm font-medium">Country</h2>
      <p className="mt-1 text-sm text-gray-500">Browser page views by country. Earlier views are not included.</p>
      {countries.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {countries.map((row) => (
            <li key={row.country} className="flex justify-between gap-4">
              <span>{row.country}</span>
              <span>{row.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-gray-500">No countries yet.</p>
      )}
      <h2 className="mt-6 text-sm font-medium">How long they stayed</h2>
      <p className="mt-1 text-sm text-gray-500">Average time on a page, measured when someone leaves it. A tab left open counts at most 30 minutes. Average so far: {formatStay(averageStay)}.</p>
      <h2 className="mt-6 text-sm font-medium">Where they came from</h2>
      <p className="mt-1 text-sm text-gray-500">A browser visit from another site, or someone who typed the address. Moving between LUUX pages is not a new source. Earlier views are not included.</p>
      {sources.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {sources.map((row) => (
            <li key={row.source} className="flex justify-between gap-4">
              <span>{row.source}</span>
              <span>{row.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-gray-500">No sources yet.</p>
      )}
      {topPaths.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 font-medium">Page</th>
                <th className="py-2 font-medium">Views</th>
                <th className="py-2 font-medium">Stay</th>
              </tr>
            </thead>
            <tbody>
              {topPaths.map((row) => (
                <tr key={row.path} className="border-b border-gray-100">
                  <td className="py-2">{row.path}</td>
                  <td className="py-2">{row.count}</td>
                  <td className="py-2">{formatStay(row.stay_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500">No page views yet.</p>
      )}
      <div className="mt-6">
        <Button helpKey="admin.marketing.ask" type="button" onClick={ask} disabled={busy === 'ask'}>
          {busy === 'ask' ? 'Asking…' : 'Ask AI'}
        </Button>
      </div>
      <div className="mt-8 space-y-8">
        {drafts.map((draft) => (
          <section key={draft.id} className="space-y-3 border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500">
              {draft.status} · {draft.rationale}
            </p>
            {draft.analysis.summary ? <p className="text-sm">{draft.analysis.summary}</p> : null}
            {draft.analysis.findings.length ? (
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {draft.analysis.findings.map((finding) => (
                  <li key={finding}>{finding}</li>
                ))}
              </ul>
            ) : null}
            <TextareaField label="Caption" rows={4} value={draft.caption} onChange={(e) => update(draft.id, { caption: e.target.value })} />
            <TextInput label="Image URL" value={draft.image_url} onChange={(e) => update(draft.id, { image_url: e.target.value })} />
            <TextInput label="Link" value={draft.link} onChange={(e) => update(draft.id, { link: e.target.value })} />
            <div className="flex flex-wrap gap-4 text-sm">
              {CHANNELS.map((channel) => (
                <label key={channel}>
                  <input
                    type="checkbox"
                    className="mr-1"
                    disabled={!connected[channel] || draft.status === 'posted'}
                    checked={draft.channels.includes(channel) && connected[channel]}
                    onChange={(event) =>
                      update(draft.id, {
                        channels: event.target.checked
                          ? [...draft.channels, channel]
                          : draft.channels.filter((item) => item !== channel),
                      })
                    }
                  />
                  {channel}
                  {connected[channel] ? '' : ' (add a token on Integrations)'}
                </label>
              ))}
            </div>
            {draft.results.map((result) => (
              <p key={result.channel} className="text-sm text-gray-600">
                {result.channel}: {result.status}
                {result.error ? ` — ${result.error}` : ''}
              </p>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button
                helpKey="admin.marketing.save"
                type="button"
                variant="secondary"
                disabled={draft.status === 'posted' || busy === `save-${draft.id}`}
                onClick={() => save(draft)}
              >
                Save draft
              </Button>
              <Button
                helpKey="admin.marketing.confirm"
                type="button"
                disabled={draft.status === 'posted' || busy === `post-${draft.id}`}
                onClick={() => confirm(draft)}
              >
                Confirm and post
              </Button>
              <Button helpKey="admin.marketing.export" type="button" variant="ghost" onClick={() => exportDraft(draft)}>
                Export JSON
              </Button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
