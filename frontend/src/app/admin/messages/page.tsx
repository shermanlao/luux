'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import HelpButton from '@/components/admin/HelpButton';
import MessageDialog, { type MessageDetail } from '@/components/admin/MessageDialog';
import AdminTable from '@/components/ui/AdminTable';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showSaveNotice } from '@/components/ui/SaveNotice';

type MessageRow = {
  id: number;
  source: string;
  name: string;
  email: string;
  subject: string;
  preview: string;
  read: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SourceFilter = 'all' | 'contact' | 'email' | 'chat';

const FILTERS: Array<{ id: SourceFilter; label: string; helpKey: string }> = [
  { id: 'all', label: 'All', helpKey: 'admin.messages.filter_all' },
  { id: 'contact', label: 'Contact form', helpKey: 'admin.messages.filter_contact' },
  { id: 'email', label: 'Email', helpKey: 'admin.messages.filter_email' },
  { id: 'chat', label: 'Chat', helpKey: 'admin.messages.filter_chat' },
];

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

function SourceIcon({ source }: { source: string }) {
  if (source === 'email') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4.5 7.5 12 13l7.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (source === 'chat') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.5 12h7M8.5 9.5h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 6.5h14v8.5H9.5L5 18.5V6.5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [mail, setMail] = useState({ smtp: false, imap: false });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [replying, setReplying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const loadSeq = useRef(0);

  const load = useCallback(async (next: SourceFilter) => {
    const seq = ++loadSeq.current;
    const query = next === 'all' ? '' : `?source=${next}`;
    const response = await fetch(`/api/admin/messages${query}`);
    const data = await response.json().catch(() => ({}));
    if (seq !== loadSeq.current) return;
    if (!response.ok) {
      showSaveNotice(data.error || 'Could not load messages', 'error');
      return;
    }
    setMessages(data.messages || []);
    setMail(data.mail || { smtp: false, imap: false });
  }, []);

  const refreshOpen = useCallback(async () => {
    const current = selectedRef.current;
    if (!current) return;
    const response = await fetch(`/api/admin/messages/${current.id}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.message) return;
    if (selectedRef.current?.id !== current.id) return;
    setSelected(data.message);
  }, []);

  useEffect(() => {
    let stop = false;
    async function showSaved() {
      try {
        await load('all');
      } catch {
        if (!stop) showSaveNotice('Could not load messages', 'error');
      } finally {
        if (!stop) setLoading(false);
      }
    }
    async function syncQuiet() {
      setSyncing(true);
      try {
        const response = await fetch('/api/admin/messages/sync', { method: 'POST' });
        const data = await response.json().catch(() => ({}));
        if (stop) return;
        if (!response.ok) {
          const message = String(data.error || '');
          const quiet = message.includes('not set up') || message.includes('already running');
          if (!quiet) showSaveNotice(message || 'Could not check the mailbox', 'error');
          return;
        }
        await load(filterRef.current);
        await refreshOpen();
      } catch {
        if (!stop) showSaveNotice('Could not check the mailbox', 'error');
      } finally {
        if (!stop) setSyncing(false);
      }
    }
    void showSaved();
    void syncQuiet();
    return () => {
      stop = true;
    };
  }, [load, refreshOpen]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(filter);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [filter, load]);

  async function choose(next: SourceFilter) {
    setFilter(next);
    setLoading(true);
    try {
      await load(next);
    } catch {
      showSaveNotice('Could not load messages', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function openMessage(row: MessageRow) {
    setError('');
    const response = await fetch(`/api/admin/messages/${row.id}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.message) {
      showSaveNotice(data.error || 'Could not open this message', 'error');
      return;
    }
    setSelected(data.message);
    setMessages((current) => current.map((item) => (item.id === row.id ? { ...item, read: true } : item)));
  }

  async function sync() {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/messages/sync', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showSaveNotice(data.error || 'Could not check the mailbox', 'error');
        return;
      }
      await load(filter);
      await refreshOpen();
      const imported = Number(data.imported || 0);
      showSaveNotice(imported ? `Mailbox checked. ${imported} new.` : 'Mailbox checked. No new mail.');
    } catch {
      showSaveNotice('Could not check the mailbox', 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function reply(body: string) {
    if (!selected) return false;
    setBusy(true);
    setReplying(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/messages/${selected.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.message) {
        setError(data.error || 'Could not send the reply.');
        return false;
      }
      setSelected(data.message);
      showSaveNotice('Reply sent');
      return true;
    } catch {
      setError('Could not send the reply.');
      return false;
    } finally {
      setBusy(false);
      setReplying(false);
    }
  }

  async function remove() {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/messages/${selected.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Could not delete this message.');
        setDeleteOpen(false);
        return;
      }
      setMessages((current) => current.filter((row) => row.id !== selected.id));
      setSelected(null);
      setDeleteOpen(false);
      showSaveNotice('Message deleted');
    } catch {
      setError('Could not delete this message.');
      setDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full px-6 py-10">
      <AdminPageHeader
        title="Messages"
        actions={
          <Button helpKey="admin.messages.sync" variant="secondary" disabled={syncing} onClick={() => void sync()}>
            {syncing ? 'Checking…' : 'Check mailbox'}
          </Button>
        }
      />
      {!loading && (!mail.smtp || !mail.imap) ? (
        <p className="mb-4 text-sm text-gray-600">
          Contact-form notes are saved here.
          {!mail.smtp ? ' Add the Agentic Mail API token on Settings to send replies and a copy of each contact-form note.' : ''}
          {!mail.imap ? ' Add the API token on Settings to read the inbox.' : ''}{' '}
          <Button helpKey="admin.nav.settings" variant="ghost" href="/admin/settings">
            Settings
          </Button>
        </p>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            helpKey={item.helpKey}
            variant={filter === item.id ? 'primary' : 'secondary'}
            onClick={() => void choose(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <AdminTable columns={[{ id: 'kind', label: '' }, 'When', 'From', 'Source', 'Message']} loading={loading} empty={!loading && !messages.length}>
        {messages.map((row) => {
          const open = () => void openMessage(row);
          const when = formatWhen(row.createdAt);
          const from = row.name || row.email;
          const cells = [when, from, sourceLabel(row.source)];
          const iconKey = row.source === 'email' ? 'admin.messages.icon_email' : row.source === 'chat' ? 'admin.messages.icon_chat' : 'admin.messages.icon_contact';
          return (
            <tr key={row.id} className="cursor-pointer hover:bg-gray-50">
              <td className="w-12 p-0">
                <HelpButton
                  helpKey={iconKey}
                  aria-label={sourceLabel(row.source)}
                  className="flex w-full cursor-pointer items-center justify-center px-3 py-3 text-gray-700"
                  onClick={open}
                >
                  <SourceIcon source={row.source} />
                </HelpButton>
              </td>
              {cells.map((value, index) => (
                <td key={index} className="p-0">
                  <HelpButton
                    helpKey="admin.messages.open"
                    className={`block w-full cursor-pointer px-6 py-3 text-left ${row.read ? '' : 'font-semibold'}`}
                    onClick={open}
                  >
                    {value}
                  </HelpButton>
                </td>
              ))}
              <td className="p-0">
                <HelpButton
                  helpKey="admin.messages.open"
                  className={`block w-full cursor-pointer px-6 py-3 text-left ${row.read ? '' : 'font-semibold'}`}
                  onClick={open}
                >
                  <div>{row.subject || '(no subject)'}</div>
                  {row.preview ? <div className="mt-1 text-sm font-normal text-gray-500">{row.preview}</div> : null}
                </HelpButton>
              </td>
            </tr>
          );
        })}
      </AdminTable>
      <MessageDialog
        message={selected}
        busy={busy}
        replying={replying}
        locked={deleteOpen}
        error={error}
        onClose={() => {
          if (busy) return;
          setSelected(null);
          setError('');
        }}
        onReply={reply}
        onDelete={() => setDeleteOpen(true)}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete message"
        message="This message and its replies will be removed."
        confirmLabel="Delete"
        confirmHelpKey="admin.confirm.delete"
        cancelHelpKey="admin.confirm.cancel"
        busy={busy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
