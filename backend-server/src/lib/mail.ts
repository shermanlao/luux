import { randomBytes } from 'crypto';
import { Op } from 'sequelize';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { downloadMailAttachment, readMailApiInbox, sendMailApi } from './hostinger-mail';
import { deleteMailFile, readMailFile, saveMailFile } from './mail-files';
import { MailRequestError } from './mail-error';
import { parseAttachments, type StoredAttachment } from './shared/mail-html';
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
  return (site.mail_from_email || site.mail_smtp_user || site.contact_email || '').trim();
}

export function mailApiToken(site: SiteSetting): string {
  return String(site.mail_api_token || '').trim();
}

export function canUseMailApi(site: SiteSetting): boolean {
  return mailApiToken(site).length > 0;
}

function preferredMailbox(site: SiteSetting): string[] {
  return [site.mail_from_email, site.contact_email, site.mail_smtp_user, site.mail_imap_user];
}

export function canSendMail(site: SiteSetting): boolean {
  if (canUseMailApi(site)) return true;
  return Boolean(site.mail_smtp_host.trim() && site.mail_smtp_user.trim() && site.mail_smtp_password && fromEmailOf(site).includes('@'));
}

export function canReadMail(site: SiteSetting): boolean {
  if (canUseMailApi(site)) return true;
  return Boolean(site.mail_imap_host.trim() && site.mail_imap_user.trim() && site.mail_imap_password);
}

function publicMailError(error: unknown): Error {
  if (error instanceof MailRequestError) return error;
  const err = error as { code?: string; message?: string; authenticationFailed?: boolean };
  const code = String(err?.code || '');
  const raw = String(err?.message || '');
  console.error('Mail error:', code || 'unknown', raw.slice(0, 300));
  if (err?.authenticationFailed || code === 'EAUTH' || /auth|credentials|invalid login|username and password/i.test(raw)) {
    return new MailRequestError('The mail server rejected the username or password.');
  }
  if (
    ['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EDNS', 'ETIMEDOUT'].includes(code) ||
    /timed out|timeout|getaddrinfo|certificate|ENOTFOUND|ECONNREFUSED/i.test(raw)
  ) {
    return new MailRequestError('Could not reach the mail server. Check the host, port, and security setting.');
  }
  return new MailRequestError('Could not complete the mail request.');
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
  options: { to: string; subject: string; text: string; replyTo?: string; inReplyTo?: string; replyUid?: number | null; replyFolder?: string }
): Promise<string> {
  if (!canSendMail(site)) {
    throw new MailRequestError('Email is not set up. Paste the Agentic Mail API token on Settings.');
  }
  if (canUseMailApi(site)) {
    try {
      return await sendMailApi(mailApiToken(site), preferredMailbox(site), {
        to: options.to,
        subject: options.subject,
        text: options.text,
        displayName: (site.mail_from_name || site.company_name || 'LUUX').trim(),
        replyUid: options.replyUid || undefined,
        replyFolder: options.replyFolder || undefined,
      });
    } catch (error) {
      throw publicMailError(error);
    }
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
    throw new MailRequestError('Incoming mail is not set up. Paste the Agentic Mail API token on Settings.');
  }
  if (inboxSyncing) {
    throw new MailRequestError('A mailbox check is already running.');
  }
  inboxSyncing = true;
  try {
    if (canUseMailApi(site)) {
      try {
        const stored = await MailboxMessage.findAll({
          where: { source: 'email', remote_folder: 'INBOX', body_html: { [Op.ne]: null } },
          attributes: ['remote_uid'],
        });
        const ready = new Set<number>();
        for (const row of stored) {
          if (row.remote_uid) ready.add(row.remote_uid);
        }
        const messages = await readMailApiInbox(mailApiToken(site), preferredMailbox(site), ownAddresses(site), ready);
        return await storeIncoming(
          site,
          messages.map((message) => ({
            name: message.name,
            address: message.address,
            subject: message.subject,
            body: message.body,
            bodyHtml: message.bodyHtml,
            attachments: message.attachments.map((file) => ({ ...file, storage: 'mail' as const })),
            contentLoaded: message.contentLoaded,
            messageId: message.messageId,
            references: message.inReplyTo ? [message.inReplyTo] : [],
            remoteUid: message.uid,
            remoteFolder: message.folder,
            createdAt: message.createdAt,
          }))
        );
      } catch (error) {
        throw publicMailError(error);
      }
    }
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

function ownAddresses(site: SiteSetting): Set<string> {
  return new Set(
    [site.mail_imap_user, site.mail_smtp_user, site.mail_from_email, site.contact_email]
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => item.includes('@'))
  );
}

type IncomingMail = {
  name: string;
  address: string;
  subject: string;
  body: string;
  bodyHtml: string;
  attachments: StoredAttachment[];
  contentLoaded: boolean;
  messageId: string;
  references: string[];
  remoteUid: number | null;
  remoteFolder: string;
  createdAt: Date | null;
};

const MAX_ATTACHMENT = 25 * 1024 * 1024;

function releaseFiles(message: IncomingMail): void {
  for (const file of message.attachments) {
    if (file.storage === 'file') deleteMailFile(file.id);
  }
}

export function discardMessageFiles(row: MailboxMessage): void {
  for (const file of parseAttachments(row.attachments)) {
    if (file.storage === 'file') deleteMailFile(file.id);
  }
}

export async function readStoredAttachment(site: SiteSetting, row: MailboxMessage, file: StoredAttachment): Promise<Buffer> {
  if (file.storage === 'file') {
    const bytes = readMailFile(file.id);
    if (!bytes) throw new MailRequestError('Could not download this attachment.');
    return bytes;
  }
  if (!canReadMail(site) || !row.remote_uid) throw new MailRequestError('Could not download this attachment.');
  return downloadMailAttachment(mailApiToken(site), preferredMailbox(site), row.remote_folder || 'INBOX', row.remote_uid, file.id);
}

async function storeIncoming(site: SiteSetting, messages: IncomingMail[]): Promise<number> {
  const own = ownAddresses(site);
  let imported = 0;
  for (const message of messages) {
    const address = message.address.trim().toLowerCase().slice(0, 200);
    if (!address || own.has(address) || !message.contentLoaded) {
      releaseFiles(message);
      continue;
    }
    const messageId = message.messageId.trim().slice(0, 500);
    const duplicate = messageId
      ? await MailboxMessage.findOne({ where: { message_id: messageId } })
      : message.remoteUid
        ? await MailboxMessage.findOne({
            where: { remote_uid: message.remoteUid, remote_folder: message.remoteFolder || 'INBOX' },
          })
        : null;
    if (duplicate) {
      if (duplicate.direction === 'in' && duplicate.body_html == null) {
        duplicate.body_html = message.bodyHtml.slice(0, 400000);
        duplicate.attachments = JSON.stringify(message.attachments);
        if (message.body) duplicate.body = message.body;
        await duplicate.save();
      } else releaseFiles(message);
      continue;
    }
    if (message.remoteUid) {
      const byUid = await MailboxMessage.findOne({
        where: { remote_uid: message.remoteUid, remote_folder: message.remoteFolder || 'INBOX' },
      });
      if (byUid) {
        if (byUid.direction === 'in' && byUid.body_html == null) {
          byUid.body_html = message.bodyHtml.slice(0, 400000);
          byUid.attachments = JSON.stringify(message.attachments);
          if (message.body) byUid.body = message.body;
          await byUid.save();
        } else releaseFiles(message);
        continue;
      }
    }
    let parentId: number | null = null;
    for (const reference of message.references) {
      const prior = await MailboxMessage.findOne({ where: { message_id: reference } });
      if (!prior) continue;
      parentId = prior.parent_id || prior.id;
      break;
    }
    await MailboxMessage.create({
      source: 'email',
      direction: 'in',
      name: message.name,
      email: address,
      subject: message.subject,
      body: message.body,
      body_html: message.bodyHtml.slice(0, 400000),
      attachments: JSON.stringify(message.attachments),
      message_id: messageId,
      inquiry_id: null,
      parent_id: parentId,
      read: false,
      remote_uid: message.remoteUid,
      remote_folder: message.remoteFolder,
      ...(message.createdAt ? { createdAt: message.createdAt } : {}),
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

function filesFromParsed(parsed: ParsedMail): StoredAttachment[] {
  const stored: StoredAttachment[] = [];
  for (const part of parsed.attachments || []) {
    if (!part.content || part.content.length > MAX_ATTACHMENT) continue;
    const id = randomBytes(12).toString('hex');
    saveMailFile(id, part.content);
    stored.push({
      id,
      filename: String(part.filename || 'attachment').replace(/[\r\n"]/g, '').slice(0, 180) || 'attachment',
      contentType: String(part.contentType || 'application/octet-stream').slice(0, 120),
      sizeBytes: part.size || part.content.length,
      inline: part.contentDisposition === 'inline' || Boolean(part.cid),
      contentId: String(part.cid || part.contentId || '').replace(/^<|>$/g, ''),
      storage: 'file',
    });
  }
  return stored;
}

async function storeInboxMessages(site: SiteSetting, sources: Buffer[]): Promise<number> {
  const own = ownAddresses(site);
  const messages: IncomingMail[] = [];
  for (const source of sources) {
    const parsed = await simpleParser(source);
    const from = parsed.from?.value?.[0];
    const address = String(from?.address || '').trim().toLowerCase();
    if (!address || own.has(address)) continue;
    const messageId = String(parsed.messageId || '').trim().slice(0, 500);
    const existing = messageId ? await MailboxMessage.findOne({ where: { message_id: messageId } }) : null;
    if (existing && (existing.direction !== 'in' || existing.body_html != null)) continue;
    const subject = String(parsed.subject || '(no subject)').replace(/\s+/g, ' ').trim().slice(0, 255) || '(no subject)';
    const attachments = filesFromParsed(parsed);
    messages.push({
      name: String(from?.name || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      address,
      subject,
      body: textFromMail(parsed),
      bodyHtml: typeof parsed.html === 'string' ? parsed.html.slice(0, 400000) : '',
      attachments,
      contentLoaded: true,
      messageId,
      references: referenceIds(parsed),
      remoteUid: null,
      remoteFolder: '',
      createdAt: parsed.date instanceof Date && !Number.isNaN(parsed.date.getTime()) ? parsed.date : null,
    });
  }
  return storeIncoming(site, messages);
}
