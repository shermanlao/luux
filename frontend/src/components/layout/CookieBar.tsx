'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HelpLink } from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

type ConsentChoice = 'all' | 'necessary';

type ConsentState = {
  decided: boolean;
  choice: ConsentChoice | null;
  notice: string;
  signedIn?: boolean;
};

export default function CookieBar() {
  const pathname = usePathname() || '';
  const onAdmin = pathname.startsWith('/admin');
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (onAdmin) return;
    let cancelled = false;
    fetch('/api/cookie-consent')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ConsentState | null) => {
        if (!cancelled && data && typeof data.decided === 'boolean') setConsent(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [onAdmin]);

  if (onAdmin || !consent || consent.decided) return null;

  async function save(choice: ConsentChoice) {
    setBusy(true);
    try {
      const response = await fetch('/api/cookie-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });
      if (!response.ok) return;
      setConsent((current) => (current ? { ...current, decided: true, choice } : current));
      setSettingsOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div aria-hidden className={settingsOpen ? 'h-80 md:h-64' : 'h-44 md:h-28'} />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] md:px-10">
        <div className="mx-auto flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm text-gray-700">{consent.notice}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button helpKey="cookies.allow" disabled={busy} onClick={() => save('all')}>
              Allow
            </Button>
            <Button helpKey="cookies.reject" variant="secondary" disabled={busy} onClick={() => save('necessary')}>
              Reject
            </Button>
            <Button helpKey="cookies.settings" variant="ghost" onClick={() => setSettingsOpen((open) => !open)}>
              Cookie settings
            </Button>
            <HelpLink helpKey="cookies.policy" href="/policies/cookie-policy" className="text-sm underline">
              Cookie policy
            </HelpLink>
          </div>
        </div>
        {settingsOpen ? (
          <div className="mx-auto mt-4 w-full border-t border-gray-200 pt-4">
            <ToggleSwitch
              helpKey="cookies.necessary"
              checked
              disabled
              label="Strictly necessary"
              onChange={() => undefined}
            />
            <p className="mt-2 max-w-3xl text-sm text-gray-600">{consent.notice}</p>
            <div className="mt-3">
              <Button helpKey="cookies.save" disabled={busy} onClick={() => save('necessary')}>
                Save
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
