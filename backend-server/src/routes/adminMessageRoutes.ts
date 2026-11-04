import { Router } from 'express';
import { Op } from 'sequelize';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { requireAdmin } from '../lib/authMiddleware';
import { canReadMail, canSendMail, importContactInquiries, sendSiteMail, syncInbox } from '../lib/mail';
import { messagePreview, replySubject } from '../lib/shared/mail-text';
import ContactInquiry from '../models/ContactInquiry';
import MailboxMessage from '../models/MailboxMessage';
import SiteSetting from '../models/SiteSetting';

const router = Router();
router.use(requireAdmin());

function serializeSummary(row: MailboxMessage) {
  return {
    id: row.id,
    source: row.source,
    name: row.name,
    email: row.email,
    subject: row.subject,
    preview: messagePreview(row.body),
    read: Boolean(row.read),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function serializeThread(row: MailboxMessage) {
  return {
    id: row.id,
    direction: row.direction,
    name: row.name,
    email: row.email,
    body: row.body,
    createdAt: row.createdAt,
  };
}

async function loadDetail(row: MailboxMessage) {
  const thread = await MailboxMessage.findAll({
    where: { parent_id: row.id },
    order: [['id', 'ASC']],
  });
  return { ...serializeSummary(row), body: row.body, thread: thread.map(serializeThread) };
}

router.get(
  '/messages',
  asyncHandler(async (req, res) => {
    await importContactInquiries();
    const source = String(req.query.source || '');
    const where: { direction: string; parent_id: null; source?: string } = { direction: 'in', parent_id: null };
    if (source === 'contact' || source === 'email') where.source = source;
    const [rows, site] = await Promise.all([
      MailboxMessage.findAll({ where, order: [['updatedAt', 'DESC'], ['id', 'DESC']] }),
      SiteSetting.findByPk(1),
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({
      messages: rows.map(serializeSummary),
      mail: { smtp: site ? canSendMail(site) : false, imap: site ? canReadMail(site) : false },
    });
  })
);

router.post(
  '/messages/sync',
  asyncHandler(async (_req, res) => {
    const site = await SiteSetting.findByPk(1);
    if (!site) return notFound(res, 'Settings');
    if (!canReadMail(site)) {
      res.status(400).json({ error: 'Incoming mail is not set up. Add the mailbox details on Settings.' });
      return;
    }
    const imported = await syncInbox(site);
    res.json({ imported });
  })
);

router.get(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    const message = await MailboxMessage.findByPk(req.params.id);
    if (!message || message.direction !== 'in' || message.parent_id) return notFound(res, 'Message');
    await MailboxMessage.update({ read: true }, { where: { [Op.or]: [{ id: message.id }, { parent_id: message.id }] } });
    message.read = true;
    res.json({ message: await loadDetail(message) });
  })
);

router.post(
  '/messages/:id/reply',
  asyncHandler(async (req, res) => {
    const message = await MailboxMessage.findByPk(req.params.id);
    if (!message || message.direction !== 'in' || message.parent_id) return notFound(res, 'Message');
    const text = String(req.body?.body || '').trim().slice(0, 8000);
    if (!text) {
      res.status(400).json({ error: 'Write a reply first.' });
      return;
    }
    if (!message.email.includes('@')) {
      res.status(400).json({ error: 'This message has no email address to reply to.' });
      return;
    }
    const site = await SiteSetting.findByPk(1);
    if (!site) return notFound(res, 'Settings');
    if (!canSendMail(site)) {
      res.status(400).json({ error: 'Email is not set up. Add the outgoing mail details on Settings.' });
      return;
    }
    const subject = replySubject(message.subject);
    const messageId = await sendSiteMail(site, {
      to: message.email,
      subject,
      text,
      inReplyTo: message.message_id || undefined,
    });
    await MailboxMessage.create({
      source: message.source,
      direction: 'out',
      name: (site.mail_from_name || site.company_name || 'LUUX').trim(),
      email: (site.mail_from_email || site.mail_smtp_user || '').trim(),
      subject,
      body: text,
      message_id: messageId,
      inquiry_id: message.inquiry_id,
      parent_id: message.id,
      read: true,
    });
    message.read = true;
    await message.save();
    res.json({ message: await loadDetail(message) });
  })
);

router.delete(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    const message = await MailboxMessage.findByPk(req.params.id);
    if (!message || message.parent_id) return notFound(res, 'Message');
    await MailboxMessage.destroy({ where: { parent_id: message.id } });
    if (message.inquiry_id) {
      await ContactInquiry.destroy({ where: { id: message.inquiry_id } });
    }
    await message.destroy();
    res.json({ ok: true });
  })
);

export default router;
