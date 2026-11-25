function looksLikeShopifyVariantSku(sku: string): boolean {
  if (/[;#]/.test(sku)) return true;
  if (sku.includes('|')) return true;
  if (/^default title$/i.test(sku)) return true;
  if (/\d+:\d+/.test(sku)) return true;
  return false;
}

/** GSC rejects Shopify option dumps masquerading as SKU values. */
export function jsonLdSku(rawSku: string | null | undefined): string | undefined {
  const sku = String(rawSku || '').trim();
  if (!sku) return undefined;
  if (sku.length > 50) return undefined;
  if (looksLikeShopifyVariantSku(sku)) return undefined;
  return sku;
}