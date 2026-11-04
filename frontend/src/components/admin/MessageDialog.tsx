'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import { TextareaField } from '@/components/ui/FormField';
import AlertBanner from '@/components/ui/AlertBanner';

export type ThreadItem = {
  id: number;
  direction: string;
  name: string;
  email: string;
  body: string;
  createdAt?: string;
};

export type MessageDetail = {
  id: number;
  source: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  createdAt?: string;
  thread: ThreadItem[];
};

function formatWhen(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-HK', { dateStyle: 'medium', timeStyle: 'short' });
}

function sourceLabel(source: string) {
  return source === 'email' ? 'Email' : 'Contact form';
}

export default function MessageDialog({
  message,
  busy = false,
  replying = false,
  locked = false,
  error = '',
  onClose,
  onReply,
  onDelete,
}: {
  message: MessageDetail | null;
  busy?: boolean;
  replying?: boolean;
  locked?: boolean;
  error?: string;
  onClose: () => void;
  onReply: (body: string) => Promise<boolean>;
  onDelete: () => void;
}) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [reply, setReply] = useState('');

  useEffect(() => {
    setReply('');
  }, [message?.id]);

  useEffect(() => {
    if (!message || locked) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [message, busy, locked]);

  if (!message || typeof document === 'undefined') return null;

  const who = message.name ? `${message.name} · ${message.email}` : message.email;
  const when = formatWhen(message.createdAt);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = reply.trim();
    if (!text || busy) return;
    const ok = await onReply(text);
    if (ok) setReply('');
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && !locked && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-2xl font-bold">
              {message.subject || '(no subject)'}
            </h2>
            <div className="mt-1 text-sm text-gray-500">
              <div>{sourceLabel(message.source)}</div>
              <div>{who}</div>
              {when ? <div>{when}</div> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button helpKey="admin.messages.delete" variant="danger" disabled={busy} onClick={onDelete}>
              Delete
            </Button>
            <Button helpKey="admin.messages.close" variant="secondary" disabled={busy} onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        {error ? <AlertBanner className="mb-4">{error}</AlertBanner> : null}
        <div className="whitespace-pre-wrap break-words text-sm">{message.body}</div>
        {message.thread.map((item) => (
          <div key={item.id} className="mt-4 border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-500">
              {item.direction === 'out' ? 'Reply' : 'Follow-up'}
              {formatWhen(item.createdAt) ? ` · ${formatWhen(item.createdAt)}` : ''}
              {item.email ? ` · ${item.email}` : ''}
            </div>
            <div className="mt-2 whitespace-pre-wrap break-words text-sm">{item.body}</div>
          </div>
        ))}
        <form onSubmit={send} className="mt-6 space-y-3 border-t border-gray-200 pt-4">
          <TextareaField
            label="Reply"
            helpKey="admin.messages.reply"
            rows={5}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
          />
          <Button helpKey="admin.messages.reply" type="submit" disabled={busy || !reply.trim()}>
            {replying ? 'Sending…' : 'Send reply'}
          </Button>
        </form>
      </div>
    </div>,
    document.body
  );
}
