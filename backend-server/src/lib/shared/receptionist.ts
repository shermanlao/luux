export type ReceptionIntent = 'shipping' | 'contact' | 'policy' | 'product';

const STOP = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'what', 'where', 'when', 'how', 'can', 'could',
  'would', 'please', 'hello', 'thanks', 'thank', 'your', 'you', 'about', 'want', 'need', 'looking', 'just',
  'like', 'some', 'shop', 'luux', 'much', 'cost', 'price', 'lamp', 'light', 'lights', 'lighting', 'pendant',
  'product', 'products', 'item', 'items', 'order', 'does', 'into', 'buy',
]);

export function productSearchWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP.has(word));
}

export function receptionIntent(text: string): ReceptionIntent | null {
  const q = text.toLowerCase();
  const hits: ReceptionIntent[] = [];
  if (/\b(ship|shipping|delivery|postage|freight)\b/.test(q)) hits.push('shipping');
  if (/\b(e-?mail|phone|call|address|contact|located|location)\b/.test(q)) hits.push('contact');
  if (/\b(refund|return|privacy|cookies?|terms|conditions)\b/.test(q)) hits.push('policy');
  if (productSearchWords(text).length && !hits.length) hits.push('product');
  if (hits.length !== 1) return null;
  return hits[0];
}

export function policyHandle(text: string): string | null {
  const q = text.toLowerCase();
  if (/\b(refund|return)\b/.test(q)) return 'refund-policy';
  if (/\bprivacy\b/.test(q)) return 'privacy-policy';
  if (/\bcookies?\b/.test(q)) return 'cookie-policy';
  if (/\b(terms|conditions)\b/.test(q)) return 'terms-of-service';
  return null;
}

export function shippingScope(text: string): 'hk' | 'world' | 'both' {
  const q = text.toLowerCase();
  const world = /\b(world|worldwide|international|overseas|abroad)\b/.test(q);
  const hk = /\bhong kong\b|\bhongkong\b|\bhk\b/.test(q);
  if (world && !hk) return 'world';
  if (hk && !world) return 'hk';
  return 'both';
}

export function plainExcerpt(html: string, max = 400): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

type Rate = { name: string; code: string; amount: string };

export function shippingAnswer(text: string, rates: Rate[]): string | null {
  const scope = shippingScope(text);
  const chosen = rates.filter((rate) => {
    if (scope === 'hk') return rate.code === 'hk' || /hong kong/i.test(rate.name);
    if (scope === 'world') return rate.code === 'world' || /world/i.test(rate.name);
    return true;
  });
  if (!chosen.length) return null;
  const lines = chosen.map((rate) => `${rate.name} shipping is HK$${rate.amount}.`);
  return lines.join(' ');
}

export function contactAnswer(site: { contact_email?: string; contact_phone?: string; contact_address?: string }): string | null {
  const parts = [
    site.contact_email?.trim() ? `Email ${site.contact_email.trim()}.` : '',
    site.contact_phone?.trim() ? `Phone ${site.contact_phone.trim()}.` : '',
    site.contact_address?.trim() ? `Address ${site.contact_address.trim()}.` : '',
  ].filter(Boolean);
  if (!parts.length) return null;
  return `You can reach LUUX this way. ${parts.join(' ')}`;
}
