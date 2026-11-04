import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import ContactInquiry from '../models/ContactInquiry';
import MailboxMessage from '../models/MailboxMessage';
import SiteSetting from '../models/SiteSetting';

type ParsedMail = Awaited<ReturnType<typeof simpleParser>>;

function portOf(value: string, fallback: number): number {
  const port = Number(String(value || '').trim());
  if (!Number.isInteger(port) || port < 1 || port > 65535) return fallback;
  return port;
}

function secureFlag(value: string): boolean {
  return value === '1' || value === 'true';
}

function fromEmailOf(site: SiteSetting): string {
  return (site.mail_from_email || site.mail_smtp_user || '').trim();
}

export function canSendMail(site: SiteSetting): boolean {
  return Boolean(site.mail_smtp_host.trim() && site.mail_smtp_user.trim() && site.mail_smtp_password && fromEmailOf(site).includes('@'));
}

export function canReadMail(site: SiteSetting): boolean {
  return Boolean(site.mail_imap_host.trim() && site.mail_imap_user.trim() && site.mail_imap_password);
}

function publicMailError(error: unknown): Error {
  const err = error as { code?: string; message?: string; authenticationFailed?: boolean };
  const code = String(err?.code || '');
  const raw = String(err?.message || '');
  console.error('Mail error:', code || 'unknown', raw.slice(0, 300));
  if (err?.authenticationFailed || code === 'EAUTH' || /auth|credentials|invalid login|username and password/i.test(raw)) {
    return new Error('The mail server rejected the username or password.');
  }
  if (
    ['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EDNS', 'ETIMEDOUT'].includes(code) ||
    /timed out|timeout|getaddrinfo|certificate|ENOTFOUND|ECONNREFUSED/i.test(raw)
  ) {
    return new Error('Could not reach the mail server. Check the host, port, and security setting.');
  }
  return new Error('Could not complete the mail request.');
}

function textFromMail(parsed: ParsedMail): string {
  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  if (text) return text.slice(0, 20000);
  const html = typeof parsed.html === 'string' ? parsed.html : '';
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

function referenceIds(parsed: ParsedMail): string[] {
  const refs = parsed.references;
  const list = Array.isArray(refs) ? refs : refs ? [refs] : [];
  if (parsed.inReplyTo) list.push(parsed.inReplyTo);
  return [...new Set(list.map((item) => String(item).trim().slice(0, 500)).filter(Boolean))];
}

export async function sendSiteMail(
  site: SiteSetting,
  options: { to: string; subject: string; text: string; replyTo?: string; inReplyTo?: string }
): Promise<string> {
  if (!canSendMail(site)) {
    throw new Error('Email is not set up. Add the outgoing mail details on Settings.');
  }
  const port = portOf(site.mail_smtp_port, 587);
  const secure = secureFlag(site.mail_smtp_secure) || port === 465;
  const fromEmail = fromEmailOf(site);
  const fromName = (site.mail_from_name || site.company_name || 'LUUX').trim();
  const transporter = nodemailer.createTransport({
    host: site.mail_smtp_host.trim(),
    port,
    secure,
    auth: { user: site.mail_smtp_user.trim(), pass: site.mail_smtp_password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  try {
    const info = await transporter.sendMail({
      from: { name: fromName, address: fromEmail },
      to: options.to,
      subject: options.subject.slice(0, 200),
      text: options.text,
      replyTo: options.replyTo || undefined,
      inReplyTo: options.inReplyTo || undefined,
      references: options.inReplyTo || undefined,
    });
    return String(info.messageId || '').slice(0, 500);
  } catch (error) {
    throw publicMailError(error);
  } finally {
    transporter.close();
  }
}

async function deliverContactCopy(row: MailboxMessage): Promise<void> {
  const site = await SiteSetting.findByPk(1);
  if (!site || !canSendMail(site)) return;
  const to = site.contact_email.trim();
  if (!to.includes('@')) return;
  try {
    const messageId = await sendSiteMail(site, {
      to,
      replyTo: row.email,
      subject: `Contact form: ${row.name || row.email}`,
      text: `Name: ${row.name}\nEmail: ${row.email}\n\n${row.body}`,
    });
    if (messageId) {
      row.message_id = messageId;
      await row.save();
    }
  } catch (error) {
    console.error('Contact form email failed:', error instanceof Error ? error.message : error);
  }
}

export async function saveContactMessage(input: { name: string; email: string; message: string }): Promise<void> {
  const inquiry = await ContactInquiry.create(input);
  const row = await MailboxMessage.create({
    source: 'contact',
    direction: 'in',
    name: input.name,
    email: input.email,
    subject: 'Contact form',
    body: input.message,
    message_id: '',
    inquiry_id: inquiry.id,
    parent_id: null,
    read: false,
  });
  void deliverContactCopy(row).catch((error) => {
    console.error('Contact form email failed:', error instanceof Error ? error.message : error);
  });
}

export async function importContactInquiries(): Promise<void> {
  const inquiries = await ContactInquiry.findAll();
  for (const inquiry of inquiries) {
    await MailboxMessage.findOrCreate({
      where: { inquiry_id: inquiry.id, direction: 'in' },
      defaults: {
        source: 'contact',
        direction: 'in',
        name: inquiry.name,
        email: inquiry.email,
        subject: 'Contact form',
        body: inquiry.message,
        message_id: '',
        inquiry_id: inquiry.id,
        parent_id: null,
        read: false,
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.createdAt,
      },
    });
  }
}

let inboxSyncing = false;

export async function syncInbox(site: SiteSetting): Promise<number> {
  if (!canReadMail(site)) {
    throw new Error('Incoming mail is not set up. Add the mailbox details on Settings.');
  }
  if (inboxSyncing) {
    throw new Error('A mailbox check is already running.');
  }
  inboxSyncing = true;
  try {
    const sources = await readInbox(site);
    return await storeInboxMessages(site, sources);
  } finally {
    inboxSyncing = false;
  }
}

async function readInbox(site: SiteSetting): Promise<Buffer[]> {
  const port = portOf(site.mail_imap_port, 993);
  const secure = secureFlag(site.mail_imap_secure) || port === 993;
  const client = new ImapFlow({
    host: site.mail_imap_host.trim(),
    port,
    secure,
    auth: { user: site.mail_imap_user.trim(), pass: site.mail_imap_password },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 25000,
  });
  let lock: { release: () => void } | null = null;
  const sources: Buffer[] = [];
  try {
    await client.connect();
    lock = await client.getMailboxLock('INBOX');
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const found = await client.search({ since }, { uid: true });
    const uids = (Array.isArray(found) ? found : []).map((uid) => Number(uid)).filter((uid) => uid > 0).slice(-40);
    if (!uids.length) return sources;
    for await (const msg of client.fetch(uids, { source: true }, { uid: true })) {
      if (msg.source) sources.push(Buffer.from(msg.source));
    }
    return sources;
  } catch (error) {
    throw publicMailError(error);
  } finally {
    lock?.release();
    await client.logout().catch(() => undefined);
  }
}

async function storeInboxMessages(site: SiteSetting, sources: Buffer[]): Promise<number> {
  const own = new Set(
    [site.mail_imap_user, site.mail_smtp_user, site.mail_from_email, site.contact_email]
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => item.includes('@'))
  );
  let imported = 0;
  for (const source of sources) {
    const parsed = await simpleParser(source);
    const from = parsed.from?.value?.[0];
    const address = String(from?.address || '').trim().toLowerCase().slice(0, 200);
    if (!address || own.has(address)) continue;
    const messageId = String(parsed.messageId || '').trim().slice(0, 500);
    if (messageId) {
      const duplicate = await MailboxMessage.findOne({ where: { message_id: messageId } });
      if (duplicate) continue;
    }
    let parentId: number | null = null;
    for (const reference of referenceIds(parsed)) {
      const prior = await MailboxMessage.findOne({ where: { message_id: reference } });
      if (!prior) continue;
      parentId = prior.parent_id || prior.id;
      break;
    }
    const subject = String(parsed.subject || '(no subject)').replace(/\s+/g, ' ').trim().slice(0, 255) || '(no subject)';
    await MailboxMessage.create({
      source: 'email',
      direction: 'in',
      name: String(from?.name || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      email: address,
      subject,
      body: textFromMail(parsed),
      message_id: messageId,
      inquiry_id: null,
      parent_id: parentId,
      read: false,
    });
    if (parentId) {
      const parent = await MailboxMessage.findByPk(parentId);
      if (parent) {
        parent.read = false;
        await parent.save();
      }
    }
    imported += 1;
  }
  return imported;
}
