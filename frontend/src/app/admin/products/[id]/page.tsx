'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import { TextInput, TextareaField } from '@/components/ui/FormField';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { Collection, Product, ProductOption, Variant } from '@/lib/types';

type DraftVariant = Variant & { _key?: string };

export default function AdminProductEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === 'new';
  const [title, setTitle] = useState('');
  const [handle, setHandle] = useState('');
  const [body, setBody] = useState('');
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<DraftVariant[]>([]);
  const [images, setImages] = useState<Product['images']>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionIds, setCollectionIds] = useState<number[]>([]);
  const [productId, setProductId] = useState<number | null>(isNew ? null : Number(params.id));

  useEffect(() => {
    fetch('/api/admin/collections')
      .then((res) => res.json())
      .then((data) => setCollections(data.collections || []));
    if (isNew) {
      setVariants([{ id: 0, title: 'Default Title', sku: '', price: '0.00', compare_at_price: null, option1: null, option2: null, option3: null, stock: 10, image_id: null, available: true }]);
      return;
    }
    fetch(`/api/admin/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        const product: Product = data.product;
        setProductId(product.id);
        setTitle(product.title);
        setHandle(product.handle);
        setBody(product.body_html);
        setPublished(product.published);
        setFeatured(product.featured);
        setOptions(product.options);
        setVariants(product.variants);
        setImages(product.images);
        setCollectionIds(product.collections.map((row) => row.id));
      });
  }, [isNew, params.id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const payload = {
      title,
      handle,
      body_html: body,
      published,
      featured,
      options: options.map((option) => ({ name: option.name, values: option.values })),
      variants: variants.map((variant) => ({
        id: variant.id || undefined,
        title: variant.title,
        sku: variant.sku,
        price: variant.price,
        option1: variant.option1,
        option2: variant.option2,
        option3: variant.option3,
        stock: variant.stock,
      })),
      collection_ids: collectionIds,
    };
    const url = isNew || !productId ? '/api/admin/products' : `/api/admin/products/${productId}`;
    const response = await fetch(url, {
      method: isNew || !productId ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showSaveNotice(data.error || 'Save failed', 'error');
      return;
    }
    showSaveNotice('Product saved');
    if (isNew) router.replace(`/admin/products/${data.product.id}`);
  }

  async function uploadImage(file: File) {
    if (!productId) {
      showSaveNotice('Save the product first, then add photos.', 'error');
      return;
    }
    const bodyForm = new FormData();
    bodyForm.set('file', file);
    const uploaded = await fetch('/api/admin/upload', { method: 'POST', body: bodyForm }).then((res) => res.json());
    if (!uploaded.src) {
      showSaveNotice(uploaded.error || 'Upload failed', 'error');
      return;
    }
    const saved = await fetch(`/api/admin/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src: uploaded.src, alt: title }),
    }).then((res) => res.json());
    setImages((current) => [...current, saved.image]);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminPageHeader title={isNew ? 'Add product' : 'Edit product'} backHref="/admin/products" backLabel="Back to products" />
      <AdminNav />
      <form onSubmit={save} className="space-y-6">
        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <TextInput label="Handle" value={handle} onChange={(e) => setHandle(e.target.value)} />
        <TextareaField label="Description HTML" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex gap-6">
          <ToggleSwitch helpKey="admin.product.save" checked={published} onChange={setPublished} label="Published" />
          <ToggleSwitch helpKey="admin.product.save" checked={featured} onChange={setFeatured} label="Featured on home" />
        </div>
        <div>
          <p className="admin-field-label">Collections</p>
          <div className="flex flex-wrap gap-3">
            {collections.map((collection) => (
              <label key={collection.id} className="text-sm">
                <input
                  type="checkbox"
                  className="mr-1"
                  checked={collectionIds.includes(collection.id)}
                  onChange={(event) =>
                    setCollectionIds((current) =>
                      event.target.checked ? [...current, collection.id] : current.filter((id) => id !== collection.id)
                    )
                  }
                />
                {collection.title}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="admin-field-label">Options</p>
          {options.map((option, index) => (
            <div key={option.id || index} className="mb-2 grid gap-2 md:grid-cols-2">
              <input
                className="input-field"
                value={option.name}
                onChange={(e) =>
                  setOptions((current) => current.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))
                }
              />
              <input
                className="input-field"
                value={option.values.join(', ')}
                onChange={(e) =>
                  setOptions((current) =>
                    current.map((row, i) => (i === index ? { ...row, values: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) } : row))
                  )
                }
              />
            </div>
          ))}
          <Button
            helpKey="admin.variant.add"
            variant="secondary"
            onClick={() =>
              setOptions((current) => [...current, { id: Date.now(), name: 'Option', position: current.length + 1, values: [] }])
            }
          >
            Add option
          </Button>
        </div>
        <div>
          <p className="admin-field-label">Variants</p>
          {variants.map((variant, index) => (
            <div key={variant.id || index} className="mb-2 grid gap-2 md:grid-cols-5">
              <input className="input-field" placeholder="Title" value={variant.title} onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)))} />
              <input className="input-field" placeholder="SKU" value={variant.sku} onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, sku: e.target.value } : row)))} />
              <input className="input-field" placeholder="Price" value={variant.price} onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, price: e.target.value } : row)))} />
              <input className="input-field" placeholder="Stock" type="number" value={variant.stock} onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, stock: Number(e.target.value) } : row)))} />
              <input className="input-field" placeholder="Option 1" value={variant.option1 || ''} onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, option1: e.target.value } : row)))} />
            </div>
          ))}
          <Button
            helpKey="admin.variant.add"
            variant="secondary"
            onClick={() =>
              setVariants((current) => [
                ...current,
                { id: 0, title: 'New', sku: '', price: '0.00', compare_at_price: null, option1: null, option2: null, option3: null, stock: 10, image_id: null, available: true },
              ])
            }
          >
            Add variant
          </Button>
        </div>
        <div>
          <p className="admin-field-label">Photos</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {images.map((image) => (
              <img key={image.id} src={image.src} alt="" className="h-20 w-20 object-cover" />
            ))}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadImage(file);
            }}
          />
        </div>
        <Button helpKey="admin.product.save" type="submit">
          Save product
        </Button>
      </form>
    </div>
  );
}
