import dns from 'dns';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { chatModel } from './marketing/ai';
import { slugify } from './shared/slugify';
import { absoluteUploadPath, ensureDir, publicUploadPath } from './uploads';

const SPEC_LABELS = [
  'Material',
  'Colour',
  'Finish',
  'Dimmable',
  'Light Source',
  'Wattage',
  'CCT',
  'Lumin',
  'Plug',
  'Power Source',
  'Shade',
  'Switch',
  'Size',
] as const;

const SPEC_STYLE = `  .spec-list {
    max-width: 600px; /* adjust as needed */
  }
  .spec-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .spec-label {
    width: 140px;          /* fixed width for alignment */
    flex-shrink: 0;
    color: #000;
  }
  .spec-value {
    color: #333333;
    text-align: left;      /* or right if you prefer values right-aligned */
    flex-grow: 1;
  }`;

const LABEL_ALIASES: Record<string, string> = {
  material: 'Material',
  colour: 'Colour',
  color: 'Colour',
  finish: 'Finish',
  dimmable: 'Dimmable',
  'light source': 'Light Source',
  wattage: 'Wattage',
  cct: 'CCT',
  'colour temperature': 'CCT',
  'color temperature': 'CCT',
  lumin: 'Lumin',
  lumen: 'Lumin',
  lumens: 'Lumin',
  plug: 'Plug',
  'power source': 'Power Source',
  voltage: 'Power Source',
  shade: 'Shade',
  switch: 'Switch',
  size: 'Size',
  dimensions: 'Size',
  dimension: 'Size',
};

const MAX_PAGE_BYTES = 2_000_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 12;
const FETCH_MS = 20_000;

export type ImportedOption = { name: string; values: string[] };
export type ImportedVariant = {
  title: string;
  sku: string;
  price: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  stock: number;
};
export type ImportedImage = { src: string; alt: string };
export type ImportedProduct = {
  title: string;
  handle: string;
  body_html: string;
  options: ImportedOption[];
  variants: ImportedVariant[];
  images: ImportedImage[];
  collection_ids: number[];
};

type SpecRow = { label: string; value: string };
type CollectionRef = { id: number; title: string; handle: string };
type AiConfig = { baseUrl: string; apiKey: string; model: string };
type PageFacts = {
  title: string;
  handle: string;
  bodyHtml: string;
  text: string;
  price: string;
  options: ImportedOption[];
  variants: ImportedVariant[];
  imageUrls: string[];
  collections: string[];
};

const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal', 'metadata']);

function fail(message: string): never {
  throw new Error(message);
}

export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    fail('Paste a full product link, including https://.');
  }
  if (url.username || url.password) fail('That link is not a public product page.');
  if (url.protocol !== 'http:' && url.protocol !== 'https:') fail('Paste a public http or https product link.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    fail('That link is not a public product page.');
  }
  if (net.isIP(host) && isPrivateIp(host)) fail('That link is not a public product page.');
  return url;
}

function isPrivateIp(ip: string): boolean {
  if (net.isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIP(ip) === 6) {
    const normalized = ip.toLowerCase().split('%')[0];
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (/^fe[89ab]/.test(normalized)) return true;
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  return true;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isPrivateIp(host)) fail('That link is not a public product page.');
    return;
  }
  let records: Array<{ address: string }> = [];
  try {
    records = await dns.promises.lookup(host, { all: true });
  } catch {
    fail('The product page could not be reached.');
  }
  if (!records.length || records.some((row) => isPrivateIp(row.address))) {
    fail('That link is not a public product page.');
  }
}

async function readLimited(response: Response, maxBytes: number): Promise<Buffer> {
  const length = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(length) && length > maxBytes) fail('That page is too large to read.');
  if (!response.body) {
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length > maxBytes) fail('That page is too large to read.');
    return buf;
  }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const step = await reader.read();
    if (step.done) break;
    total += step.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      fail('That page is too large to read.');
    }
    chunks.push(Buffer.from(step.value));
  }
  return Buffer.concat(chunks);
}

async function fetchPublic(raw: string, maxBytes: number): Promise<{ url: URL; contentType: string; buffer: Buffer }> {
  let current = assertPublicUrl(raw);
  let rateRetries = 0;
  for (let hop = 0; hop < 5; hop += 1) {
    await assertPublicHost(current.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_MS);
    let response: Response;
    try {
      response = await fetch(current.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'luux-importer/1.0',
          Accept: 'text/html,application/json,image/*;q=0.8,*/*;q=0.5',
        },
      });
    } catch {
      fail('The product page could not be reached.');
    } finally {
      clearTimeout(timer);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => undefined);
      if (!location) fail('The product page could not be reached.');
      current = assertPublicUrl(new URL(location, current).toString());
      continue;
    }
    if ((response.status === 429 || response.status === 503) && rateRetries < 2) {
      rateRetries += 1;
      await response.body?.cancel().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1200 * rateRetries));
      hop -= 1;
      continue;
    }
    if (response.status < 200 || response.status >= 300) fail(`The product page returned ${response.status}.`);
    const buffer = await readLimited(response, maxBytes);
    return {
      url: current,
      contentType: (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase(),
      buffer,
    };
  }
  fail('The product page could not be reached.');
}

function decodeText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, digits) => {
      const code = Number(digits);
      return code > 0 && code < 65536 ? String.fromCharCode(code) : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function canonicalLabel(label: string): string {
  const clean = label.replace(/:\s*$/, '').replace(/\s+/g, ' ').trim();
  return LABEL_ALIASES[clean.toLowerCase()] || clean;
}

export function parseSpecRows(html: string): SpecRow[] {
  if (!/spec-label/i.test(html)) return [];
  const rows: SpecRow[] = [];
  const pattern = /class="spec-label"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="spec-value"[^>]*>([\s\S]*?)<\/div>/gi;
  for (const match of html.matchAll(pattern)) {
    const label = decodeText(match[1] || '');
    const value = decodeText(match[2] || '');
    if (label && value) rows.push({ label, value });
  }
  return rows;
}

function specRowHtml(label: string, value: string): string {
  return `<div class="spec-row">\n<div class="spec-label">${escapeHtml(label)}:</div>\n<div class="spec-value">${escapeHtml(value)}</div>\n</div>`;
}

export function buildSpecHtml(rows: SpecRow[]): string {
  const values = new Map<string, string>();
  const extras: SpecRow[] = [];
  const known = new Set<string>(SPEC_LABELS);
  for (const row of rows) {
    const label = canonicalLabel(row.label).slice(0, 40);
    const value = row.value.replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!label || !value) continue;
    if (known.has(label)) {
      const current = values.get(label);
      if (!current || current.toUpperCase() === 'N/A') values.set(label, value);
      else if (value.toUpperCase() !== 'N/A' && current !== value) values.set(label, `${current} / ${value}`);
    } else if (value.toUpperCase() !== 'N/A') {
      extras.push({ label, value });
    }
  }
  const lines = SPEC_LABELS.map((label) => specRowHtml(label, values.get(label) || 'N/A'));
  for (const extra of extras.slice(0, 8)) lines.push(specRowHtml(extra.label, extra.value));
  return `<div class="spec-list">\n${lines.join('\n')}\n<style>\n${SPEC_STYLE}\n</style>\n\n\n</div>\n`;
}

function money(value: unknown, cents = false): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const amount = cents && Number.isInteger(value) ? value / 100 : value;
    return amount.toFixed(2);
  }
  const cleaned = String(value ?? '').replace(/,/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return '0.00';
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function optionValue(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null') return null;
  return text.slice(0, 120);
}

function cleanOptions(raw: unknown): ImportedOption[] {
  if (!Array.isArray(raw)) return [];
  const options: ImportedOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { name?: unknown; values?: unknown };
    const name = String(row.name || '').trim().slice(0, 80);
    const values = Array.isArray(row.values)
      ? row.values.map((value) => String(value).trim()).filter(Boolean).slice(0, 30)
      : [];
    if (!name || !values.length) continue;
    if (name === 'Title' && values.length === 1 && values[0] === 'Default Title') continue;
    options.push({ name, values });
    if (options.length === 3) break;
  }
  return options;
}

function cleanVariants(raw: unknown, fallbackPrice: string, cents = false): ImportedVariant[] {
  if (!Array.isArray(raw)) return [];
  const variants: ImportedVariant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const option1 = optionValue(row.option1);
    const option2 = optionValue(row.option2);
    const option3 = optionValue(row.option3);
    const parts = [option1, option2, option3].filter(Boolean);
    const title = String(row.title || '').trim() || parts.join(' / ') || 'Default Title';
    const available = row.available;
    variants.push({
      title: title.slice(0, 180),
      sku: String(row.sku || '').trim().slice(0, 80),
      price: money(row.price ?? fallbackPrice, cents),
      option1: option1 === 'Default Title' ? null : option1,
      option2,
      option3,
      stock: available === false ? 0 : 10,
    });
    if (variants.length === 40) break;
  }
  return variants;
}

function defaultVariant(price: string): ImportedVariant {
  return { title: 'Default Title', sku: '', price: money(price), option1: null, option2: null, option3: null, stock: 10 };
}

function absoluteHttp(value: string, base: URL): string | null {
  const raw = value.trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return null;
  try {
    const url = new URL(raw, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function looksLikeProductPhoto(url: string): boolean {
  let pathname = url.toLowerCase();
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch {
    /* keep the raw string */
  }
  if (pathname.endsWith('.svg')) return false;
  return !/(logo|icon|sprite|favicon|pixel|badge|payment|flag|placeholder|spinner|avatar)/.test(pathname);
}

function pushImage(list: string[], value: string | null) {
  if (!value || !looksLikeProductPhoto(value)) return;
  if (list.some((item) => item === value)) return;
  list.push(value);
}

function imageFromUnknown(value: unknown, base: URL, list: string[]) {
  if (!value) return;
  if (typeof value === 'string') {
    pushImage(list, absoluteHttp(value, base));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => imageFromUnknown(item, base, list));
    return;
  }
  if (typeof value === 'object') {
    const row = value as { url?: unknown; src?: unknown; image?: unknown };
    imageFromUnknown(row.url || row.src || row.image, base, list);
  }
}

function stripFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function tidyTitle(value: string): string {
  return value
    .replace(/\s+[-|]\s+Buy Product on Alibaba\.com$/i, '')
    .replace(/\s+[-|]\s+Alibaba\.com$/i, '')
    .trim();
}

function safeHandle(handle: string, title: string): string {
  const clean = handle.trim().toLowerCase();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) return clean.slice(0, 180);
  return title.trim() ? slugify(title) : '';
}

function shopifyJsUrl(page: URL): string | null {
  if (!/\/products\/[^/]+\/?$/i.test(page.pathname) || page.pathname.endsWith('.js')) return null;
  const next = new URL(page.toString());
  next.pathname = `${page.pathname.replace(/\/$/, '')}.js`;
  next.search = '';
  next.hash = '';
  return next.toString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseProductJson(text: string, page: URL, cents = false): PageFacts | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
  const row = asRecord(parsed);
  if (!row || typeof row.title !== 'string' || !row.title.trim()) return null;
  if (!Array.isArray(row.variants) && !Array.isArray(row.images) && typeof row.body_html !== 'string') return null;
  const images: string[] = [];
  if (Array.isArray(row.images)) {
    for (const image of row.images) imageFromUnknown(asRecord(image)?.src, page, images);
  }
  const tags = Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)) : String(row.tags || '').split(',');
  const productType = String(row.product_type || '').trim();
  return {
    title: row.title.trim().slice(0, 180),
    handle: safeHandle(String(row.handle || ''), row.title),
    bodyHtml: String(row.body_html || ''),
    text: '',
    price: money((asRecord(Array.isArray(row.variants) ? row.variants[0] : null) || {}).price, cents),
    options: cleanOptions(row.options),
    variants: cleanVariants(row.variants, '0', cents),
    imageUrls: images.slice(0, MAX_IMAGES),
    collections: [productType, ...tags].map((item) => item.trim()).filter(Boolean),
  };
}

function metaContent(html: string, key: string): string {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
    'i'
  );
  const match = html.match(pattern);
  return decodeText(match?.[1] || match?.[2] || '');
}

function collectJsonLd(node: unknown, found: Array<Record<string, unknown>>) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((item) => collectJsonLd(item, found));
    return;
  }
  const row = asRecord(node);
  if (!row) return;
  const type = row['@type'];
  const types = (Array.isArray(type) ? type : [type]).map((item) => String(item || '').toLowerCase());
  if (types.includes('product')) found.push(row);
  if (row['@graph']) collectJsonLd(row['@graph'], found);
}

function jsonLdProducts(html: string): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectJsonLd(JSON.parse(match[1]), found);
    } catch {
      /* a broken block is skipped */
    }
  }
  return found;
}

function offerPrice(offers: unknown): string {
  const list = Array.isArray(offers) ? offers : [offers];
  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    if (row.price != null) return money(row.price);
    if (row.lowPrice != null) return money(row.lowPrice);
  }
  return '0.00';
}

function visibleText(html: string): string {
  return decodeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
  ).slice(0, 12000);
}

function htmlImages(html: string, base: URL): string[] {
  const images: string[] = [];
  pushImage(images, absoluteHttp(metaContent(html, 'og:image'), base));
  for (const product of jsonLdProducts(html)) imageFromUnknown(product.image, base, images);
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const element = tag[0];
    const srcset = element.match(/\bsrcset=["']([^"']+)["']/i)?.[1] || '';
    if (srcset) {
      const best = srcset
        .split(',')
        .map((part) => {
          const bits = part.trim().split(/\s+/);
          return { url: bits[0] || '', width: Number((bits[1] || '').replace(/w$/i, '')) || 0 };
        })
        .sort((a, b) => b.width - a.width)[0];
      pushImage(images, best ? absoluteHttp(best.url, base) : null);
    }
    const src = element.match(/\b(?:src|data-src)=["']([^"']+)["']/i)?.[1] || '';
    const width = Number(element.match(/\bwidth=["']?(\d+)/i)?.[1] || 0);
    const height = Number(element.match(/\bheight=["']?(\d+)/i)?.[1] || 0);
    if ((width && width < 40) || (height && height < 40)) continue;
    pushImage(images, absoluteHttp(src, base));
    if (images.length >= 24) break;
  }
  return images;
}

function parseHtmlPage(html: string, page: URL): PageFacts {
  const products = jsonLdProducts(html);
  const product = products[0];
  const title = decodeText(String(product?.name || '')) || metaContent(html, 'og:title') || decodeText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').split('|')[0] || '');
  const description = decodeText(String(product?.description || '')) || metaContent(html, 'og:description');
  const price = offerPrice(product?.offers);
  return {
    title: title.slice(0, 180),
    bodyHtml: '',
    text: [description, visibleText(html)].filter(Boolean).join('\n').slice(0, 12000),
    price,
    options: [],
    variants: [],
    imageUrls: htmlImages(html, page).slice(0, 24),
    handle: title ? slugify(title) : '',
    collections: [String(product?.category || '')].map((item) => decodeText(item)).filter(Boolean),
  };
}

function sameImage(left: string, right: string): boolean {
  try {
    const a = new URL(left);
    const b = new URL(right);
    return a.origin === b.origin && a.pathname === b.pathname;
  } catch {
    return left === right;
  }
}

function chooseImages(extracted: string[], preferred: string[]): string[] {
  const pool = [...extracted];
  for (const url of preferred) {
    if (!looksLikeProductPhoto(url)) continue;
    if (!pool.some((item) => sameImage(item, url))) pool.push(url);
  }
  const picked: string[] = [];
  for (const url of preferred) {
    const match = pool.find((item) => sameImage(item, url));
    if (match && !picked.includes(match)) picked.push(match);
  }
  for (const url of pool) {
    if (!picked.includes(url)) picked.push(url);
    if (picked.length >= MAX_IMAGES) break;
  }
  return picked.slice(0, MAX_IMAGES);
}

async function requestAiFacts(facts: PageFacts, collections: CollectionRef[], ai: AiConfig): Promise<Record<string, unknown>> {
  if (!ai.apiKey) fail('Save an AI API key on Integrations.');
  const base = (ai.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const xai = (() => {
    try {
      return new URL(base).host === 'api.x.ai';
    } catch {
      return false;
    }
  })();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  let response: Response;
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.apiKey}` },
      body: JSON.stringify({
        model: chatModel(base, ai.model),
        temperature: 0.2,
        ...(xai ? { reasoning_effort: 'low' } : {}),
        messages: [
          {
            role: 'system',
            content:
              'You extract lamp facts from a product page. Reply with JSON only: {"title":"","specs":[{"label":"Material","value":""}],"options":[{"name":"Size","values":[""]}],"variants":[{"title":"","sku":"","price":"0.00","option1":null,"option2":null,"option3":null}],"image_urls":[""],"collections":[""]}. Use only facts on the page. Prefer these spec labels when the page states them: Material, Colour, Finish, Dimmable, Light Source, Wattage, CCT, Lumin, Plug, Power Source, Shade, Switch, Size. Omit a label the page does not state. Spell Colour in British English. Keep the price digits as shown, without converting currency. image_urls must be copied from the image list. collections must be copied from the shop collection list and only when the page names that group. Use at most 3 options.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              title: facts.title,
              price: facts.price,
              text: facts.text.slice(0, 8000),
              images: facts.imageUrls.slice(0, 24),
              collections: collections.map((row) => row.title),
            }),
          },
        ],
      }),
    });
  } catch {
    fail('The AI API took too long to read that page.');
  } finally {
    clearTimeout(timer);
  }
  const body = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string } | string;
  };
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    fail(message || 'The AI API did not return product details.');
  }
  const content = body.choices?.[0]?.message?.content || '';
  if (!content) fail('The AI API returned an empty product.');
  try {
    const parsed = JSON.parse(stripFence(content)) as unknown;
    const record = asRecord(parsed);
    if (!record) fail('The AI API returned an empty product.');
    return record;
  } catch {
    fail('The AI API returned an empty product.');
  }
}

function imageExtension(contentType: string, url: string): string | null {
  const types: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  if (types[contentType]) return types[contentType];
  let ext = '';
  try {
    ext = path.extname(new URL(url).pathname).toLowerCase();
  } catch {
    return null;
  }
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) && (!contentType || contentType.startsWith('image/') || contentType === 'application/octet-stream')) {
    return ext === '.jpeg' ? '.jpg' : ext;
  }
  return null;
}

async function downloadImages(urls: string[], handle: string, alt: string): Promise<ImportedImage[]> {
  const saved: ImportedImage[] = [];
  for (const [index, url] of urls.entries()) {
    try {
      const fetched = await fetchPublic(url, MAX_IMAGE_BYTES);
      const ext = imageExtension(fetched.contentType, fetched.url.toString());
      if (!ext) continue;
      const filename = `${handle}-${index + 1}-${Date.now()}${ext}`;
      const dir = absoluteUploadPath('products');
      ensureDir(dir);
      fs.writeFileSync(path.join(dir, filename), fetched.buffer);
      saved.push({ src: publicUploadPath('products', filename), alt });
    } catch {
      /* one broken photo does not drop the rest */
    }
  }
  return saved;
}

function matchCollections(names: string[], collections: CollectionRef[]): number[] {
  const ids: number[] = [];
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!key) continue;
    const handle = slugify(key);
    const found = collections.find((row) => row.title.toLowerCase() === key || row.handle.toLowerCase() === key || row.handle.toLowerCase() === handle);
    if (found && !ids.includes(found.id)) ids.push(found.id);
  }
  return ids;
}

function nameList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8);
}

function specList(value: unknown): SpecRow[] {
  if (!Array.isArray(value)) return [];
  const rows: SpecRow[] = [];
  for (const item of value) {
    const row = asRecord(item);
    if (!row) continue;
    const label = String(row.label || '').trim();
    const cell = String(row.value || '').trim();
    if (label && cell) rows.push({ label, value: cell });
  }
  return rows;
}

export async function importProductFromUrl(rawUrl: string, ai: AiConfig, collections: CollectionRef[]): Promise<ImportedProduct> {
  const page = assertPublicUrl(rawUrl);
  const first = await fetchPublic(page.toString(), MAX_PAGE_BYTES);
  const firstText = first.buffer.toString('utf8');
  let facts = parseProductJson(firstText, first.url, first.url.pathname.endsWith('.js'));
  if (!facts) {
    facts = parseHtmlPage(firstText, first.url);
    const jsUrl = shopifyJsUrl(first.url);
    if (jsUrl) {
      try {
        const second = await fetchPublic(jsUrl, MAX_PAGE_BYTES);
        const structured = parseProductJson(second.buffer.toString('utf8'), second.url, true);
        if (structured) {
          structured.imageUrls = structured.imageUrls.length ? structured.imageUrls : facts.imageUrls;
          structured.collections = [...structured.collections, ...facts.collections];
          if (!parseSpecRows(structured.bodyHtml).length && parseSpecRows(firstText).length) structured.bodyHtml = firstText;
          if (!structured.bodyHtml) structured.text = facts.text;
          facts = structured;
        }
      } catch {
        /* the html page is still enough to continue */
      }
    }
  }

  const existingSpecs = parseSpecRows(facts.bodyHtml).length ? parseSpecRows(facts.bodyHtml) : parseSpecRows(firstText);
  let specs = existingSpecs;
  let options = facts.options;
  let variants = facts.variants;
  let imageUrls = facts.imageUrls;
  let names = facts.collections;
  let title = facts.title;

  if (!existingSpecs.length || !title.trim()) {
    const drafted = await requestAiFacts({ ...facts, text: facts.text || visibleText(facts.bodyHtml) }, collections, ai);
    if (!existingSpecs.length) specs = specList(drafted.specs);
    title = title || String(drafted.title || '').trim();
    if (!options.length) options = cleanOptions(drafted.options);
    if (!variants.length) variants = cleanVariants(drafted.variants, facts.price);
    imageUrls = chooseImages(facts.imageUrls, nameList(drafted.image_urls).map((item) => absoluteHttp(item, page) || '').filter(Boolean));
    names = [...names, ...nameList(drafted.collections)];
  }

  title = tidyTitle(title);
  if (!title) fail('Could not read a product on that page.');
  const handle = safeHandle(facts.handle, title);
  if (!variants.length) variants = [defaultVariant(facts.price)];
  const images = await downloadImages(imageUrls.slice(0, MAX_IMAGES), handle, title);

  return {
    title,
    handle,
    body_html: buildSpecHtml(specs),
    options,
    variants,
    images,
    collection_ids: matchCollections(names, collections),
  };
}
