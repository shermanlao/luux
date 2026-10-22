'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatHkd } from '@shared/slugify';
import type { Product } from '@/lib/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetch('/api/admin/products').then((res) => res.json());
    setProducts(data.products || []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeader
        title="Products"
        actions={
          <Button helpKey="admin.product.new" href="/admin/products/new">
            Add product
          </Button>
        }
      />
      <AdminNav />
      <AdminTable columns={['Product', 'Price', 'Variants', '']} loading={loading} empty={!products.length}>
        {products.map((product) => (
          <tr key={product.id}>
            <td className="px-6 py-3">{product.title}</td>
            <td className="px-6 py-3">{formatHkd(product.price)}</td>
            <td className="px-6 py-3">{product.variants.length}</td>
            <td className="px-6 py-3">
              <div className="flex gap-2">
                <Button helpKey="admin.product.edit" variant="secondary" href={`/admin/products/${product.id}`}>
                  Edit
                </Button>
                <Button helpKey="admin.product.delete" variant="danger" onClick={() => setDeleteId(product.id)}>
                  Delete
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>
      <ConfirmDialog
        open={deleteId != null}
        title="Delete product"
        message="This lamp will be removed from the shop."
        confirmHelpKey="admin.confirm.delete"
        cancelHelpKey="admin.confirm.cancel"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId == null) return;
          await fetch(`/api/admin/products/${deleteId}`, { method: 'DELETE' });
          setDeleteId(null);
          await load();
        }}
      />
    </div>
  );
}
