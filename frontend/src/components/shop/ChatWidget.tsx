'use client';

import { FormEvent, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';

type ChatLine = {
  id: number;
  direction: string;
  body: string;
};

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let stop = false;
    async function pull() {
      const response = await fetch('/api/chat', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (stop || !response.ok) return;
      setLines(data.messages || []);
      setHandedOff(Boolean(data.handedOff));
    }
    void pull();
    const timer = window.setInterval(() => void pull(), 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [open]);

  if (pathname.startsWith('/admin')) return null;

  async function send(event?: FormEvent, handoff = false) {
    event?.preventDefault();
    const next = text.trim();
    if (busy || (!handoff && !next)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: next, handoff }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Could not send that message.');
        return;
      }
      setLines(data.messages || []);
      setHandedOff(Boolean(data.handedOff));
      if (!handoff) setText('');
    } catch {
      setError('Could not send that message.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open ? (
        <div className="flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <p className="font-semibold">LUUX</p>
            <Button helpKey="shop.chat.open" variant="ghost" type="button" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
          <div className="flex-1 space-y-3 overflow-auto px-4 py-3 text-sm">
            {lines.length ? (
              lines.map((line) => (
                <p key={line.id} className={line.direction === 'out' ? 'text-gray-800' : 'text-gray-500'}>
                  {line.direction === 'out' ? 'LUUX' : 'You'}: {line.body}
                </p>
              ))
            ) : (
              <p className="text-gray-500">Ask about a lamp, shipping, or how to reach us.</p>
            )}
            {error ? <p className="text-red-700">{error}</p> : null}
          </div>
          <form onSubmit={(event) => void send(event)} className="space-y-2 border-t border-gray-200 p-3">
            <textarea
              value={text}
              rows={2}
              className="w-full border border-gray-300 px-3 py-2 text-sm"
              placeholder="Write a message"
              onChange={(event) => setText(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button helpKey="shop.chat.send" type="submit" disabled={busy || !text.trim()}>
                {busy ? 'Sending…' : 'Send'}
              </Button>
              <Button helpKey="shop.chat.handoff" type="button" variant="secondary" disabled={busy || handedOff} onClick={() => void send(undefined, true)}>
                Ask a person
              </Button>
            </div>
          </form>
        </div>
      ) : null}
      <Button helpKey="shop.chat.open" type="button" onClick={() => setOpen((current) => !current)}>
        Chat
      </Button>
    </div>
  );
}
