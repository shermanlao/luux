const STORAGE_KEY = 'luux_shipping';

export function readShippingId(): number | null {
  if (typeof window === 'undefined') return null;
  const id = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function writeShippingId(id: number) {
  window.localStorage.setItem(STORAGE_KEY, String(id));
}
