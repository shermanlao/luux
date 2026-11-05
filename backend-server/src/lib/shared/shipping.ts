export function shippingMatchesCountry(countries: string, country: string): boolean {
  const raw = String(countries || '*').trim();
  if (!raw || raw === '*') return true;
  const code = String(country || '').trim().toUpperCase();
  if (!code) return false;
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
