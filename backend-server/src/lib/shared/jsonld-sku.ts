/** GSC rejects Shopify option dumps masquerading as SKU values. */
export function jsonLdSku(rawSku: string | null | undefined): string | undefined {
  const sku = String(rawSku || '').trim();
  if (!sku) return undefined;
  if (sku.length > 50) return undefined;
  if (sku.includes('|')) return undefined;
  if (/^default title$/i.test(sku)) return undefined;
  return sku;
}