export function slugify(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

export function formatHkd(amount: number | string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return 'HK$0.00';
  return `HK$${n.toLocaleString('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function hkdToCents(amount: number | string): number {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}

export function centsToHkd(cents: number): number {
  return Math.round(cents) / 100;
}
