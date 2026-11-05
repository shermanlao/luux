export type StoredAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  inline: boolean;
  contentId: string;
  storage: 'mail' | 'file';
};

export type MailFile = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

const BLOCKED = new Set(['script', 'iframe', 'object', 'embed', 'applet', 'form', 'base', 'link', 'meta', 'frame', 'frameset']);
const VOID_BLOCKED = new Set(['meta', 'link', 'base', 'embed']);

export function attachmentPath(messageId: number, attachmentId: string): string {
  return `/api/admin/messages/${messageId}/file?attachment=${encodeURIComponent(attachmentId)}`;
}

export function parseAttachments(value: unknown): StoredAttachment[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      const id = String(row.id || '').trim();
      if (!id || id.length > 400) return [];
      return [
        {
          id,
          filename: String(row.filename || 'attachment').replace(/[\r\n"]/g, '').slice(0, 180) || 'attachment',
          contentType: String(row.contentType || 'application/octet-stream').slice(0, 120),
          sizeBytes: Number(row.sizeBytes) || 0,
          inline: Boolean(row.inline),
          contentId: String(row.contentId || '').slice(0, 300),
          storage: row.storage === 'file' ? 'file' : 'mail',
        },
      ];
    });
  } catch {
    return [];
  }
}

export function publicFiles(value: unknown): MailFile[] {
  return parseAttachments(value).map((file) => ({
    id: file.id,
    filename: file.filename,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
  }));
}

function cidKey(value: string): string {
  const raw = value.replace(/^cid:/i, '').trim();
  try {
    return decodeURIComponent(raw).replace(/^<|>$/g, '').trim().toLowerCase();
  } catch {
    return raw.replace(/^<|>$/g, '').trim().toLowerCase();
  }
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '%22').replace(/</g, '%3C').replace(/>/g, '%3E');
}

function safeUrl(attr: string, value: string, messageId: number, attachments: StoredAttachment[]): string {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return '#';
  if (lower.startsWith('data:')) {
    if (attr === 'src' && /^data:image\/(png|jpeg|gif|webp);base64,/i.test(trimmed) && trimmed.length < 2_000_000) return trimmed;
    return '#';
  }
  if (attr === 'src' && lower.startsWith('cid:')) {
    const key = cidKey(trimmed);
    const file = attachments.find((item) => cidKey(item.contentId) === key);
    return file ? attachmentPath(messageId, file.id) : '#';
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (attr === 'href' && (lower.startsWith('mailto:') || lower.startsWith('#'))) return trimmed;
  return '#';
}

function cleanStyle(value: string): string {
  return value.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, _quote, url) => {
    const target = String(url || '').trim();
    if (/^https?:\/\//i.test(target)) return full;
    if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(target) && target.length < 2_000_000) return full;
    return 'none';
  });
}

function findTagEnd(html: string, start: number): number {
  let quote = '';
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '>') return i;
  }
  return -1;
}

function findClose(html: string, tag: string, from: number): number {
  const open = `<${tag}`;
  const close = `</${tag}`;
  let depth = 1;
  let i = from;
  const lower = html.toLowerCase();
  while (i < html.length) {
    const nextOpen = lower.indexOf(open, i);
    const nextClose = lower.indexOf(close, i);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const after = lower[nextOpen + open.length];
      if (after && /[a-z0-9]/.test(after)) {
        i = nextOpen + open.length;
        continue;
      }
      depth += 1;
      i = nextOpen + open.length;
      continue;
    }
    depth -= 1;
    const end = findTagEnd(html, nextClose);
    if (end === -1) return -1;
    if (depth === 0) return end + 1;
    i = end + 1;
  }
  return -1;
}

function rewriteTag(tagHtml: string, tag: string, messageId: number, attachments: StoredAttachment[]): string {
  let next = tagHtml
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+srcset\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(?:formaction|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  next = next.replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi, (_full, _quoted, dq: string | undefined, sq: string | undefined) => {
    const quote = dq !== undefined ? '"' : "'";
    return ` style=${quote}${cleanStyle(dq ?? sq ?? '')}${quote}`;
  });
  next = next.replace(/\s(href|src|action)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (_full, attr: string, _quoted: string, dq?: string, sq?: string, bare?: string) => {
    const safe = safeUrl(attr.toLowerCase(), dq ?? sq ?? bare ?? '', messageId, attachments);
    return ` ${attr}="${escapeAttr(safe)}"`;
  });
  if (tag === 'a') {
    next = next.replace(/\starget\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, '');
    next = next.replace(/\srel\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, '');
    next = next.replace(/>$/, ' target="_blank" rel="noopener noreferrer">');
  }
  return next;
}

export function prepareMailHtml(html: string, messageId: number, attachments: StoredAttachment[]): string {
  let result = '';
  let i = 0;
  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html[i] !== '<') {
      result += html[i];
      i += 1;
      continue;
    }
    if (/^<https?:/i.test(html.slice(i, i + 12)) || /^<mailto:/i.test(html.slice(i, i + 12))) {
      result += html[i];
      i += 1;
      continue;
    }
    const tagMatch = /^<\/?([a-zA-Z0-9:-]+)/.exec(html.slice(i));
    if (!tagMatch) {
      result += html[i];
      i += 1;
      continue;
    }
    const tag = tagMatch[1].toLowerCase();
    const isClose = html[i + 1] === '/';
    const tagEnd = findTagEnd(html, i);
    if (tagEnd === -1) {
      result += html.slice(i);
      break;
    }
    if (BLOCKED.has(tag)) {
      if (isClose || VOID_BLOCKED.has(tag)) {
        i = tagEnd + 1;
        continue;
      }
      const close = findClose(html, tag, tagEnd + 1);
      i = close === -1 ? html.length : close;
      continue;
    }
    if (!isClose) result += rewriteTag(html.slice(i, tagEnd + 1), tag, messageId, attachments);
    else result += html.slice(i, tagEnd + 1);
    i = tagEnd + 1;
  }
  return result.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (block) => cleanStyle(block).replace(/@import[^;]+;?/gi, ''));
}

export function plainTextToHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linked = escaped.replace(/https?:\/\/[^\s<]+/g, (url) => {
    const trimmed = url.replace(/[),.;:!?]+$/g, '');
    const tail = url.slice(trimmed.length);
    return `<a href="${trimmed}">${trimmed}</a>${tail}`;
  });
  return `<div style="white-space:pre-wrap;font-family:inherit">${linked}</div>`;
}

export function messageHtml(row: { id: number; body: string; body_html?: string | null }, attachments: StoredAttachment[]): string {
  const source = row.body_html && row.body_html.trim() ? row.body_html : plainTextToHtml(row.body || '');
  const safe = prepareMailHtml(source, row.id, attachments);
  if (/<html[\s>]/i.test(safe)) return safe;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:Arial,sans-serif;font-size:14px;color:#111;overflow-wrap:anywhere}img,video{max-width:100%;height:auto}table{max-width:100%}a{color:#1d4ed8}</style></head><body>${safe}</body></html>`;
}

export function inlineImageType(contentType: string): string | null {
  const match = /^image\/(png|jpeg|jpg|gif|webp)\b/i.exec(contentType.trim());
  if (!match) return null;
  const kind = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
  return `image/${kind}`;
}

export function contentDisposition(filename: string, inline: boolean): string {
  const clean = filename.replace(/[\r\n"]/g, '').slice(0, 180) || 'attachment';
  const ascii = clean.replace(/[^\x20-\x7E]/g, '_') || 'attachment';
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}
