'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { HelpLink, useHelpTip } from '@/components/admin/HelpButton';
import AdminTable from '@/components/ui/AdminTable';
import Button from '@/components/ui/Button';
import { formatHkd } from '@shared/slugify';
import type { AdminTableColumn } from '@/components/ui/AdminTable';
import type { Collection, Product } from '@/lib/types';

type SortKey = 'title' | 'price' | 'variants';
type SortDir = 'asc' | 'desc';

function compareProducts(a: Product, b: Product, key: SortKey) {
  if (key === 'title') return a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true });
  if (key === 'price') return Number(a.price) - Number(b.price);
  return a.variants.length - b.variants.length;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const collectionTip = useHelpTip('admin.product.filter_collection');
  const searchTip = useHelpTip('admin.product.search');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/admin/products').then((res) => res.json()).catch(() => ({ products: [] })),
      fetch('/api/admin/collections').then((res) => res.json()).catch(() => ({ collections: [] })),
    ])
      .then(([productData, collectionData]) => {
        if (cancelled) return;
        setProducts(productData.products || []);
        setCollections(collectionData.collections || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      if (collectionId && !product.collections.some((collection) => String(collection.id) === collectionId)) return false;
      if (needle && !product.title.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const delta = compareProducts(a, b, sort.key);
      if (delta !== 0) return sort.dir === 'asc' ? delta : -delta;
      return b.id - a.id;
    });
  }, [collectionId, products, query, sort]);

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: 'asc' };
      return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
    });
  }

  function sortColumn(id: SortKey, label: string, helpKey: string): AdminTableColumn {
    return {
      id,
      label,
      helpKey,
      sorted: sort?.key === id ? sort.dir : undefined,
      onSort: () => toggleSort(id),
    };
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeader
        title="Products"
        actions={
          <>
            <input
              className="input-field w-56"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              data-help-key="admin.product.search"
              title={searchTip || undefined}
            />
            <select
              className="select-field w-44"
              value={collectionId}
              onChange={(event) => setCollectionId(event.target.value)}
              aria-label="Collection"
              data-help-key="admin.product.filter_collection"
              title={collectionTip || undefined}
            >
              <option value="">All collections</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.title}
                </option>
              ))}
            </select>
            <Button helpKey="admin.product.new" href="/admin/products/new">
              Add product
            </Button>
          </>
        }
      />
      <AdminTable
        columns={[
          sortColumn('title', 'Product', 'admin.product.sort_title'),
          sortColumn('price', 'Price', 'admin.product.sort_price'),
          sortColumn('variants', 'Variants', 'admin.product.sort_variants'),
        ]}
        loading={loading}
        empty={!rows.length}
      >
        {rows.map((product) => {
          const href = `/admin/products/${product.id}`;
          const photo = product.images[0]?.src;
          return (
            <tr
              key={product.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => router.push(href)}
            >
              <td className="px-6 py-3">
                <HelpLink helpKey="admin.product.edit" href={href} className="flex items-center gap-3">
                  {photo ? (
                    <img src={photo} alt="" className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <span className="h-12 w-12 rounded bg-gray-100" />
                  )}
                  <span>{product.title}</span>
                </HelpLink>
              </td>
              <td className="px-6 py-3">{formatHkd(product.price)}</td>
              <td className="px-6 py-3">{product.variants.length}</td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
