import { isRemoteHongKongDelivery, type HongKongAddressFields } from './hkRemote';

export function shippingMatchesCountry(countries: string, country: string): boolean {
  const raw = String(countries || '*').trim();
  const code = String(country || '').trim().toUpperCase();
  if (!code) return false;
  if (!raw || raw === '*') return code !== 'HK';
  return raw
    .split(/[,\s]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .includes(code);
}

export function normalizeShippingCountries(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '*') return '*';
  const codes = [...new Set(raw.split(/[,\s]+/).map((item) => item.trim().toUpperCase()).filter(Boolean))];
  return codes.length ? codes.join(',') : '*';
}

export function normalizeShippingAmount(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) return null;
  return amount.toFixed(2);
}

export type ShippingRateChoice = { code: string; countries: string };

export function shippingRateEligible(
  rate: ShippingRateChoice,
  country: string,
  address: HongKongAddressFields = {}
): boolean {
  if (!shippingMatchesCountry(rate.countries, country)) return false;
  const code = String(country || '').trim().toUpperCase();
  if (code !== 'HK') return rate.code !== 'hk' && rate.code !== 'hk-remote';
  const remote = isRemoteHongKongDelivery(address);
  if (rate.code === 'hk') return !remote;
  if (rate.code === 'hk-remote') return remote;
  return false;
}
