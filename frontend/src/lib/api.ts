import type { Collection, Page, Product, ShippingRate, SitePayload } from './types';

const API_ORIGIN = process.env.API_ORIGIN || 'http://127.0.0.1:3333';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_ORIGIN}${path}`, { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function loadSite(): Promise<SitePayload> {
  return apiGet<SitePayload>('/api/site');
}

export async function loadCollections(): Promise<Collection[]> {
  const data = await apiGet<{ collections: Collection[] }>('/api/collections');
  return data.collections;
}

export async function loadCollection(handle: string) {
  return apiGet<{ collection: Collection; products: Product[] }>(`/api/collections/${handle}`);
}

export async function loadProduct(handle: string) {
  return apiGet<{ product: Product }>(`/api/products/${handle}`);
}

export async function loadFeatured() {
  return apiGet<{ products: Product[] }>('/api/products?featured=1');
}

export async function loadSearch(q: string) {
  return apiGet<{ products: Product[]; q: string }>(`/api/search?q=${encodeURIComponent(q)}`);
}

export async function loadPage(handle: string) {
  return apiGet<{ page: Page }>(`/api/pages/${handle}`);
}

export async function loadShipping() {
  return apiGet<{ rates: ShippingRate[] }>('/api/shipping');
}

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
}
