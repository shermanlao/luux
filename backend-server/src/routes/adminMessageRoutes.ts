import { Router } from 'express';
import { Op } from 'sequelize';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { requireAdmin } from '../lib/authMiddleware';
import { requestAiReply } from '../lib/aiText';
import { canReadMail, canSendMail, discardMessageFiles, importContactInquiries, readStoredAttachment, sendSiteMail, syncInbox } from '../lib/mail';
import { contentDisposition, inlineImageType, messageHtml, parseAttachments, publicFiles } from '../lib/shared/mail-html';
import { shopFacts } from '../lib/shopFacts';
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

function presentContent(row: MailboxMessage) {
  const attachments = parseAttachments(row.attachments);
  return {
    html: messageHtml(row, attachments),
    files: publicFiles(row.attachments),
  };
}

function serializeThread(row: MailboxMessage) {
  return {
    id: row.id,
    direction: row.direction,
    name: row.name,
    email: row.email,
    body: row.body,
    ...presentContent(row),
    createdAt: row.createdAt,
  };
}

async function loadDetail(row: MailboxMessage) {
  const thread = await MailboxMessage.findAll({
    where: { parent_id: row.id },
    order: [['id', 'ASC']],
  });
  return { ...serializeSummary(row), body: row.body, ...presentContent(row), thread: thread.map(serializeThread) };
}

router.get(
  '/messages',
  asyncHandler(async (req, res) => {
    await importContactInquiries();
    const source = String(req.query.source || '');
    const where: { direction: string; parent_id: null; source?: string } = { direction: 'in', parent_id: null };
    if (source === 'contact' || source === 'email' || source === 'chat') where.source = source;
    const [rows, site] = await Promise.all([
      MailboxMessage.findAll({
        where,
        attributes: { exclude: ['body_html', 'attachments'] },
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
      }),
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
      res.status(400).json({ error: 'Incoming mail is not set up. Paste the Agentic Mail API token on Settings.' });
      return;
    }
    const imported = await syncInbox(site);
    res.json({ imported });
  })
);

router.get(
  '/messages/:id/file',
  asyncHandler(async (req, res) => {
    const message = await MailboxMessage.findByPk(req.params.id);
    if (!message) return notFound(res, 'Message');
    const raw = req.query.attachment;
    const wanted = (Array.isArray(raw) ? String(raw[0] || '') : String(raw || '')).trim();
    const file = parseAttachments(message.attachments).find((item) => item.id === wanted);
    if (!file) return notFound(res, 'Attachment');
    const site = await SiteSetting.findByPk(1);
    if (!site) return notFound(res, 'Settings');
    const bytes = await readStoredAttachment(site, message, file);
    const image = inlineImageType(file.contentType);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, no-store');
    res.set('Content-Disposition', contentDisposition(file.filename, Boolean(image)));
    res.type(image || 'application/octet-stream');
    res.send(bytes);
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
  '/messages/:id/draft',
  asyncHandler(async (req, res) => {
    const message = await MailboxMessage.findByPk(req.params.id);
    if (!message || message.direction !== 'in' || message.parent_id) return notFound(res, 'Message');
    const site = await SiteSetting.findByPk(1);
    if (!site?.ai_api_key) {
      res.status(400).json({ error: 'Add the AI key on Integrations before drafting a reply.' });
      return;
    }
    const thread = await MailboxMessage.findAll({ where: { parent_id: message.id }, order: [['id', 'ASC']] });
    const history = [message, ...thread]
      .map((row) => `${row.direction === 'out' ? 'Shop' : row.name || 'Visitor'}: ${row.body}`)
      .join('\n\n')
      .slice(0, 8000);
    try {
      const facts = await shopFacts(site, `${message.subject}\n${message.body}`);
      const result = await requestAiReply(
        { baseUrl: site.ai_base_url, apiKey: site.ai_api_key, model: site.ai_model },
        facts,
        `Draft a reply to this thread.\n\n${history}`
      );
      if (!result.answer) {
        res.status(400).json({ error: 'The AI could not draft a reply.' });
        return;
      }
      res.json({ reply: result.answer });
    } catch (error) {
      console.error('Draft reply:', error instanceof Error ? error.message : error);
      res.status(400).json({ error: 'The AI could not draft a reply.' });
    }
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
    const site = await SiteSetting.findByPk(1);
    if (!site) return notFound(res, 'Settings');
    if (message.source === 'chat') {
      let messageId = '';
      if (message.email.includes('@') && canSendMail(site)) {
        messageId = await sendSiteMail(site, {
          to: message.email,
          subject: replySubject(message.subject),
          text,
          inReplyTo: message.message_id || undefined,
          replyUid: message.remote_uid,
          replyFolder: message.remote_folder || undefined,
        });
      }
      await MailboxMessage.create({
        source: 'chat',
        direction: 'out',
        name: (site.mail_from_name || site.company_name || 'LUUX').trim(),
        email: (site.mail_from_email || site.contact_email || '').trim(),
        subject: replySubject(message.subject),
        body: text,
        message_id: messageId,
        inquiry_id: null,
        parent_id: message.id,
        read: true,
      });
      message.read = true;
      await message.save();
      res.json({ message: await loadDetail(message) });
      return;
    }
    if (!message.email.includes('@')) {
      res.status(400).json({ error: 'This message has no email address to reply to.' });
      return;
    }
    if (!canSendMail(site)) {
      res.status(400).json({ error: 'Email is not set up. Paste the Agentic Mail API token on Settings.' });
      return;
    }
    const subject = replySubject(message.subject);
    const messageId = await sendSiteMail(site, {
      to: message.email,
      subject,
      text,
      inReplyTo: message.message_id || undefined,
      replyUid: message.remote_uid,
      replyFolder: message.remote_folder || undefined,
    });
    await MailboxMessage.create({
      source: message.source,
      direction: 'out',
      name: (site.mail_from_name || site.company_name || 'LUUX').trim(),
      email: (site.mail_from_email || site.contact_email || site.mail_smtp_user || '').trim(),
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
    const children = await MailboxMessage.findAll({ where: { parent_id: message.id } });
    for (const child of children) discardMessageFiles(child);
    discardMessageFiles(message);
    await MailboxMessage.destroy({ where: { parent_id: message.id } });
    if (message.inquiry_id) {
      await ContactInquiry.destroy({ where: { id: message.inquiry_id } });
    }
    await message.destroy();
    res.json({ ok: true });
  })
);

export default router;
