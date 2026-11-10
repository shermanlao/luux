'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { trafficSourceLabel } from '@shared/marketing-funnel';
import { visitorKind } from '@shared/visitorKind';
import { noteVisit } from '@/lib/funnel';

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
    if (visitorKind(navigator.userAgent) !== 'Human') return;
    const path = pathname.split('?')[0].slice(0, 200);
    const source = trafficSourceLabel(
      new URLSearchParams(window.location.search).get('utm_source') || '',
      document.referrer,
      window.location.hostname
    );
    postTraffic(source ? { path, source } : { path });
    noteVisit(path);
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
