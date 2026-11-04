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
