'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';

type SaveNoticeVariant = 'success' | 'error';
type SaveNoticeAction = { label: string; href: string; helpKey: string };
type SaveNoticeItem = { id: number; message: string; variant: SaveNoticeVariant; action?: SaveNoticeAction };
type Listener = (notice: SaveNoticeItem | null) => void;

const listeners = new Set<Listener>();
let current: SaveNoticeItem | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;

function hideSaveNotice(id?: number) {
  if (id != null && current?.id !== id) return;
  current = null;
  if (hideTimer) clearTimeout(hideTimer);
  listeners.forEach((listener) => listener(null));
}

export function showSaveNotice(message: string, variant: SaveNoticeVariant = 'success', action?: SaveNoticeAction) {
  const text = message.trim();
  if (!text || typeof window === 'undefined') return;
  const notice: SaveNoticeItem = { id: ++sequence, message: text, variant, action };
  current = notice;
  listeners.forEach((listener) => listener(notice));
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => hideSaveNotice(notice.id), action ? 8000 : 5000);
}

export default function SaveNotice() {
  const [notice, setNotice] = useState<SaveNoticeItem | null>(null);
  useEffect(() => {
    const listener: Listener = (next) => setNotice(next);
    listeners.add(listener);
    listener(current);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  if (!notice) return null;
  const tone =
    notice.variant === 'success'
      ? 'border-green-500 bg-green-100 text-green-800'
      : 'border-red-500 bg-red-100 text-red-800';
  return (
    <div
      key={notice.id}
      role={notice.variant === 'error' ? 'alert' : 'status'}
      className={`fixed bottom-6 left-1/2 z-50 flex w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-md border-l-4 px-4 py-3 text-sm shadow-lg ${tone}`}
    >
      <span>{notice.message}</span>
      {notice.action ? (
        <span onClick={() => hideSaveNotice(notice.id)}>
          <Button helpKey={notice.action.helpKey} href={notice.action.href} variant="accent" className="px-3 py-1.5 text-xs">
            {notice.action.label}
          </Button>
        </span>
      ) : null}
    </div>
  );
}
