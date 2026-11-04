'use client';

import { useCallback, useEffect, useState } from 'react';
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

type SourceFilter = 'all' | 'contact' | 'email';

const FILTERS: Array<{ id: SourceFilter; label: string; helpKey: string }> = [
  { id: 'all', label: 'All', helpKey: 'admin.messages.filter_all' },
  { id: 'contact', label: 'Contact form', helpKey: 'admin.messages.filter_contact' },
  { id: 'email', label: 'Email', helpKey: 'admin.messages.filter_email' },
];

function formatWhen(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-HK', { dateStyle: 'medium', timeStyle: 'short' });
}

function sourceLabel(source: string) {
  return source === 'email' ? 'Email' : 'Contact form';
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

  const load = useCallback(async (next: SourceFilter) => {
    const query = next === 'all' ? '' : `?source=${next}`;
    const response = await fetch(`/api/admin/messages${query}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showSaveNotice(data.error || 'Could not load messages', 'error');
      return;
    }
    setMessages(data.messages || []);
    setMail(data.mail || { smtp: false, imap: false });
  }, []);

  useEffect(() => {
    load('all')
      .catch(() => showSaveNotice('Could not load messages', 'error'))
      .finally(() => setLoading(false));
  }, [load]);

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
    <div className="mx-auto max-w-6xl px-4 py-10">
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
          {!mail.smtp ? ' Add outgoing mail on Settings to send replies and a copy of each contact-form note.' : ''}
          {!mail.imap ? ' Add incoming mail on Settings to read the inbox.' : ''}{' '}
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
      <AdminTable columns={['When', 'From', 'Source', 'Message']} loading={loading} empty={!loading && !messages.length}>
        {messages.map((row) => {
          const open = () => void openMessage(row);
          const when = formatWhen(row.updatedAt || row.createdAt);
          const from = row.name || row.email;
          const cells = [when, from, sourceLabel(row.source)];
          return (
            <tr key={row.id} className="cursor-pointer hover:bg-gray-50">
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
