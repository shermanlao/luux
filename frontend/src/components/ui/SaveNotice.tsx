'use client';

import { useEffect, useState } from 'react';

type SaveNoticeVariant = 'success' | 'error';
type SaveNoticeItem = { id: number; message: string; variant: SaveNoticeVariant };
type Listener = (notice: SaveNoticeItem | null) => void;

const listeners = new Set<Listener>();
let current: SaveNoticeItem | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;

export function showSaveNotice(message: string, variant: SaveNoticeVariant = 'success') {
  const text = message.trim();
  if (!text || typeof window === 'undefined') return;
  const notice: SaveNoticeItem = { id: ++sequence, message: text, variant };
  current = notice;
  listeners.forEach((listener) => listener(notice));
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (current?.id !== notice.id) return;
    current = null;
    listeners.forEach((listener) => listener(null));
  }, 5000);
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
      className={`pointer-events-none fixed bottom-6 left-1/2 z-50 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 rounded-md border-l-4 px-4 py-3 text-sm shadow-lg ${tone}`}
    >
      {notice.message}
    </div>
  );
}
