import { MailRequestError } from './mail-error';
import { chooseMailbox, type MailboxRef } from './shared/mail-api';

const MAIL_API = 'https://api.mail.hostinger.com';

type Address = { name?: string | null; address?: string | null };
type ListedMessage = {
  uid?: number;
  date?: string | null;
  subject?: string | null;
  from?: Address | null;
  to?: Address[];
  messageId?: string | null;
  inReplyTo?: string | null;
};

export type ApiInboxMessage = {
  uid: number;
  folder: string;
  name: string;
  address: string;
  subject: string;
  messageId: string;
  inReplyTo: string;
  body: string;
  createdAt: Date | null;
};

function plainText(text: string, html: string): string {
  const plain = text.trim();
  if (plain) return plain.slice(0, 20000);
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20000);
}

function mailFailure(status: number, payload: { error?: string; code?: string }): MailRequestError {
  if (status === 401) return new MailRequestError('The mail API rejected the token.');
  if (status === 403) return new MailRequestError('This token cannot manage that mailbox.');
  if (status === 404) return new MailRequestError('That mail folder was not found.');
  if (status === 429) return new MailRequestError('The mail API is busy. Wait a moment and try again.');
  console.error('Mail API', status, payload.code || '', String(payload.error || '').slice(0, 200));
  return new MailRequestError('Could not complete the mail request.');
}

async function mailApi(token: string, path: string, init?: { method?: string; body?: string }): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${MAIL_API}${path}`, {
      method: init?.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body,
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    console.error('Mail API network:', error instanceof Error ? error.message : error);
    throw new MailRequestError('Could not reach the mail API.');
  }
  if (response.status === 204) return null;
  const payload = (await response.json().catch(() => ({}))) as { data?: unknown; error?: string; code?: string };
  if (!response.ok) throw mailFailure(response.status, payload);
  return payload;
}

async function listMailboxes(token: string): Promise<MailboxRef[]> {
  const payload = (await mailApi(token, '/api/v1/me')) as {
    data?: { mailboxes?: MailboxRef[] };
  } | null;
  return Array.isArray(payload?.data?.mailboxes) ? payload.data.mailboxes : [];
}

export async function resolveMailbox(token: string, preferred: string[]): Promise<MailboxRef> {
  const mailbox = chooseMailbox(await listMailboxes(token), preferred);
  if (!mailbox) {
    throw new MailRequestError('This token can reach more than one mailbox. Set From address to the one this shop should use.');
  }
  return mailbox;
}

async function listFolder(token: string, mailboxId: string, folder: string, perPage: number): Promise<ListedMessage[]> {
  const path = `/api/v1/mailboxes/${encodeURIComponent(mailboxId)}/folders/${encodeURIComponent(folder)}/messages?perPage=${perPage}&sort=-uid`;
  const payload = (await mailApi(token, path)) as { data?: ListedMessage[] } | null;
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function messageBody(token: string, mailboxId: string, folder: string, uid: number): Promise<string> {
  const path = `/api/v1/mailboxes/${encodeURIComponent(mailboxId)}/folders/${encodeURIComponent(folder)}/messages/${uid}/text`;
  const payload = (await mailApi(token, path)) as { data?: { text?: string; html?: string } } | null;
  return plainText(String(payload?.data?.text || ''), String(payload?.data?.html || ''));
}

export async function readMailApiInbox(token: string, preferred: string[], own: Set<string>): Promise<ApiInboxMessage[]> {
  const mailbox = await resolveMailbox(token, preferred);
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const listed = await listFolder(token, mailbox.resourceId, 'INBOX', 40);
  const incoming: ApiInboxMessage[] = [];
  for (const item of listed) {
    const uid = Number(item.uid);
    if (!Number.isInteger(uid) || uid < 1) continue;
    const createdAt = item.date ? new Date(item.date) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime()) && createdAt.getTime() < since) continue;
    const address = String(item.from?.address || '').trim().toLowerCase().slice(0, 200);
    if (!address || own.has(address) || address === mailbox.address.trim().toLowerCase()) continue;
    const subject = String(item.subject || '(no subject)').replace(/\s+/g, ' ').trim().slice(0, 255) || '(no subject)';
    incoming.push({
      uid,
      folder: 'INBOX',
      name: String(item.from?.name || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      address,
      subject,
      messageId: String(item.messageId || '').trim().slice(0, 500),
      inReplyTo: String(item.inReplyTo || '').trim().slice(0, 500),
      body: await messageBody(token, mailbox.resourceId, 'INBOX', uid),
      createdAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
    });
  }
  return incoming;
}

async function sentCopy(token: string, mailboxId: string, subject: string, to: string): Promise<string> {
  const wantedSubject = subject.replace(/\s+/g, ' ').trim().toLowerCase();
  const wantedTo = to.trim().toLowerCase();
  for (const folder of ['INBOX.Sent', 'Sent']) {
    let listed: ListedMessage[] = [];
    try {
      listed = await listFolder(token, mailboxId, folder, 5);
    } catch (error) {
      console.error('Sent folder lookup:', error instanceof Error ? error.message : error);
      continue;
    }
    const match = listed.find((item) => {
      const itemSubject = String(item.subject || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const recipients = (item.to || []).map((entry) => String(entry.address || '').trim().toLowerCase());
      return itemSubject === wantedSubject && recipients.includes(wantedTo) && String(item.messageId || '').trim();
    });
    if (match?.messageId) return String(match.messageId).trim().slice(0, 500);
  }
  return '';
}

export async function sendMailApi(
  token: string,
  preferred: string[],
  options: { to: string; subject: string; text: string; displayName: string; replyUid?: number; replyFolder?: string }
): Promise<string> {
  const mailbox = await resolveMailbox(token, preferred);
  const payload: Record<string, unknown> = {
    to: [options.to],
    subject: options.subject.slice(0, 200),
    text: options.text,
    displayName: options.displayName,
  };
  if (options.replyUid && options.replyUid > 0) {
    payload.inReplyTo = { uid: options.replyUid, folder: options.replyFolder || 'INBOX' };
  }
  await mailApi(token, `/api/v1/mailboxes/${encodeURIComponent(mailbox.resourceId)}/send`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return sentCopy(token, mailbox.resourceId, options.subject.slice(0, 200), options.to);
}
