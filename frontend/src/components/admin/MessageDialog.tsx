'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpLink } from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import { TextareaField } from '@/components/ui/FormField';
import AlertBanner from '@/components/ui/AlertBanner';

export type MailFile = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type ThreadItem = {
  id: number;
  direction: string;
  name: string;
  email: string;
  body: string;
  html?: string;
  files?: MailFile[];
  createdAt?: string;
};

export type MessageDetail = {
  id: number;
  source: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  html?: string;
  files?: MailFile[];
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
  if (source === 'email') return 'Email';
  if (source === 'chat') return 'Chat';
  return 'Contact form';
}

function formatSize(bytes: number) {
  if (!bytes || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MailView({ html, text }: { html?: string; text: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  function fit() {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.body) return;
    const height = Math.max(doc.body.scrollHeight, doc.documentElement?.scrollHeight || 0);
    frame.style.height = `${Math.min(Math.max(height + 8, 48), 6000)}px`;
  }
  useEffect(() => {
    const timers = [300, 1000, 2000].map((ms) => window.setTimeout(fit, ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [html]);
  if (!html) return <div className="whitespace-pre-wrap break-words text-sm">{text}</div>;
  return (
    <iframe
      ref={frameRef}
      title="Message"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={html}
      referrerPolicy="no-referrer"
      className="w-full bg-white"
      style={{ height: 120 }}
      onLoad={fit}
    />
  );
}

function FileLinks({ messageId, files }: { messageId: number; files?: MailFile[] }) {
  if (!files?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {files.map((file) => {
        const size = formatSize(file.sizeBytes);
        return (
          <HelpLink
            key={file.id}
            helpKey="admin.messages.attachment"
            href={`/api/admin/messages/${messageId}/file?attachment=${encodeURIComponent(file.id)}`}
            download={file.filename || 'attachment'}
            className="btn-secondary max-w-full whitespace-normal text-left"
          >
            {file.filename || 'Attachment'}
            {size ? ` (${size})` : ''}
          </HelpLink>
        );
      })}
    </div>
  );
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
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');

  useEffect(() => {
    setReply('');
    setDraftError('');
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

  async function draftReply() {
    if (!message || busy || drafting) return;
    setDrafting(true);
    setDraftError('');
    try {
      const response = await fetch(`/api/admin/messages/${message.id}/draft`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.reply) {
        setDraftError(data.error || 'The AI could not draft a reply.');
        return;
      }
      setReply(data.reply);
    } catch {
      setDraftError('The AI could not draft a reply.');
    } finally {
      setDrafting(false);
    }
  }

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
        className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
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
        {error || draftError ? <AlertBanner className="mb-4">{error || draftError}</AlertBanner> : null}
        <MailView html={message.html} text={message.body} />
        <FileLinks messageId={message.id} files={message.files} />
        {message.thread.map((item) => (
          <div key={item.id} className="mt-4 border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-500">
              {item.direction === 'out' ? 'Reply' : 'Follow-up'}
              {formatWhen(item.createdAt) ? ` · ${formatWhen(item.createdAt)}` : ''}
              {item.email ? ` · ${item.email}` : ''}
            </div>
            <div className="mt-2">
              <MailView html={item.html} text={item.body} />
              <FileLinks messageId={item.id} files={item.files} />
            </div>
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
          <div className="flex flex-wrap gap-2">
            <Button helpKey="admin.messages.draft" type="button" variant="secondary" disabled={busy || drafting} onClick={() => void draftReply()}>
              {drafting ? 'Drafting…' : 'Draft reply'}
            </Button>
            <Button helpKey="admin.messages.reply" type="submit" disabled={busy || drafting || !reply.trim()}>
              {replying ? 'Sending…' : message.source === 'chat' && !message.email.includes('@') ? 'Send in chat' : 'Send reply'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
