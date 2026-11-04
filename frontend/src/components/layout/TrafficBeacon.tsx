'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

function visitSource(): string {
  const token = (new URLSearchParams(window.location.search).get('utm_source') || '').trim().toLowerCase();
  if (token === 'ig' || token === 'instagram') return 'Instagram';
  if (token === 'fb' || token === 'facebook') return 'Facebook';
  if (token === 'google') return 'Google';
  if (token === 'threads') return 'Threads';
  if (token === 'pinterest') return 'Pinterest';
  if (token === 'bing') return 'Bing';
  if (token === 'yahoo') return 'Yahoo';
  const referrer = document.referrer;
  if (!referrer) return 'Direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
    const here = window.location.hostname.replace(/^www\./, '').toLowerCase();
    if (host === here) return '';
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('facebook') || host === 'fb.com' || host.endsWith('.fb.com')) return 'Facebook';
    if (host.includes('google')) return 'Google';
    if (host.includes('threads')) return 'Threads';
    if (host.includes('pinterest')) return 'Pinterest';
    if (host.includes('bing')) return 'Bing';
    if (host.includes('yahoo')) return 'Yahoo';
    return 'Other';
  } catch {
    return 'Direct';
  }
}

function postTraffic(body: Record<string, unknown>, keepalive = false) {
  void fetch('/api/traffic', {
    method: 'POST',
    credentials: 'omit',
    keepalive,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}

export default function TrafficBeacon() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    const path = pathname.split('?')[0].slice(0, 200);
    const source = visitSource();
    postTraffic(source ? { path, source } : { path });
    const started = Date.now();
    let sent = false;
    const sendStay = () => {
      if (sent) return;
      sent = true;
      const seconds = Math.min(30 * 60, Math.round((Date.now() - started) / 1000));
      if (seconds < 1) return;
      postTraffic({ path, seconds }, true);
    };
    window.addEventListener('pagehide', sendStay);
    return () => {
      window.removeEventListener('pagehide', sendStay);
      sendStay();
    };
  }, [pathname]);

  return null;
}
