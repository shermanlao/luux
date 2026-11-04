'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function TrafficBeacon() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    const path = pathname.split('?')[0].slice(0, 200);
    void fetch('/api/traffic', {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
