'use client';

import {
  applyTouch,
  checkoutSessionKey,
  clearStoredTouch,
  readStoredTouch,
  readUtm,
  visitSessionKey,
  visitTouch,
  writeStoredTouch,
  type ClientFunnelEvent,
  type StoredTouch,
} from '@shared/marketing-funnel';
import { FUNNEL_APP, isProductPath } from '@shared/marketing-funnel-luux';

export const FUNNEL_SHOP = FUNNEL_APP;

let lastVisitKey = '';

function postFunnel(events: ClientFunnelEvent[], path: string, attribution: StoredTouch | null) {
  if (!events.length) return;
  void fetch('/api/funnel', {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, events, attribution }),
  }).catch(() => undefined);
}

export function currentAttribution(): StoredTouch | null {
  return readStoredTouch(FUNNEL_APP);
}

export function noteVisit(path: string): void {
  if (typeof window === 'undefined') return;
  const key = `${path}?${window.location.search}`;
  if (lastVisitKey === key) return;
  lastVisitKey = key;
  const now = new Date();
  const incoming = visitTouch({
    app: FUNNEL_APP,
    utm: readUtm(window.location.search),
    referrer: document.referrer,
    pageHost: window.location.hostname,
    path,
    now,
  });
  const existing = readStoredTouch(FUNNEL_APP, now);
  const next = applyTouch(existing, incoming, now);
  if (next) writeStoredTouch(FUNNEL_APP, next);
  else if (!incoming) clearStoredTouch(FUNNEL_APP);
  const events: ClientFunnelEvent[] = [];
  const visitKey = visitSessionKey(FUNNEL_APP);
  const started = !window.sessionStorage.getItem(visitKey);
  const newClick = Boolean(
    incoming &&
      (!existing ||
        incoming.source !== existing.source ||
        incoming.campaign !== existing.campaign ||
        incoming.content !== existing.content ||
        incoming.medium !== existing.medium)
  );
  if (started || newClick) {
    events.push('landing');
    window.sessionStorage.setItem(visitKey, '1');
  }
  if (isProductPath(path)) events.push('product_view');
  postFunnel(events, path, next);
}

export function recordAddToCart(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname.split('?')[0].slice(0, 200) || '/';
  postFunnel(['add_to_cart'], path, readStoredTouch(FUNNEL_APP));
}

export function recordCheckoutStart(): void {
  if (typeof window === 'undefined') return;
  const key = checkoutSessionKey(FUNNEL_APP);
  if (window.sessionStorage.getItem(key)) return;
  window.sessionStorage.setItem(key, '1');
  postFunnel(['checkout_start'], '/checkout', readStoredTouch(FUNNEL_APP));
}
