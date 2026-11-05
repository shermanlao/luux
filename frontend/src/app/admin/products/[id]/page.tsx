'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import HelpButton from '@/components/admin/HelpButton';
import ProductPhotoAiEditDialog from '@/components/admin/ProductPhotoAiEditDialog';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { TextInput } from '@/components/ui/FormField';
import HtmlField from '@/components/ui/HtmlField';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import { effectivePhotoTags, type OptionTag } from '@/lib/photoOptions';
import type { Collection, Product, ProductOption, Variant } from '@/lib/types';

type DraftVariant = Variant & { _key?: string };

const MAX_GENERATED_VARIANTS = 100;

function blankVariant(overrides: Partial<DraftVariant> = {}): DraftVariant {
  return {
    id: 0,
    title: 'New',
    sku: '',
    price: '0.00',
    compare_at_price: null,
    option1: null,
    option2: null,
    option3: null,
    stock: 10,
    image_id: null,
    available: true,
    _key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...overrides,
  };
}

function optionValueLists(options: ProductOption[]): string[][] {
  return options.slice(0, 3).map((option) => option.values.map((value) => value.trim()).filter(Boolean));
}

function variantOptionKey(option1: string | null, option2: string | null, option3: string | null) {
  return [option1 || '', option2 || '', option3 || ''].join('\u0000');
}

function variantsFromOptions(
  options: ProductOption[],
  current: DraftVariant[]
): { variants: DraftVariant[]; notice: string } | { error: string } {
  if (!options.length) return { error: 'Add an option before generating variants.' };
  const lists = optionValueLists(options);
  if (!lists.length || lists.some((values) => values.length === 0)) {
    return { error: 'Each of the first three options needs a value. Separate values with commas.' };
  }
  const combos = lists.reduce<string[][]>(
    (acc, list) => acc.flatMap((combo) => list.map((value) => [...combo, value])),
    [[]]
  );
  if (combos.length > MAX_GENERATED_VARIANTS) {
    return { error: 'That makes more than 100 variants. Use fewer values.' };
  }
  const byKey = new Map(
    current.map((variant) => [variantOptionKey(variant.option1, variant.option2, variant.option3), variant])
  );
  const template = current[0];
  const variants = combos.map((combo) => {
    const option1 = combo[0] || null;
    const option2 = combo[1] || null;
    const option3 = combo[2] || null;
    const title = combo.filter(Boolean).join(' / ');
    const existing = byKey.get(variantOptionKey(option1, option2, option3));
    if (existing) {
      return {
        ...existing,
        title,
        option1,
        option2,
        option3,
        _key: existing._key || `saved-${existing.id}`,
      };
    }
    return blankVariant({
      title,
      option1,
      option2,
      option3,
      price: template?.price || '0.00',
      stock: template?.stock ?? 10,
    });
  });
  const ignored = options.length > 3 && options.slice(3).some((option) => option.values.some((value) => value.trim()));
  const notice = ignored
    ? `Created ${variants.length} variants from the first three options.`
    : `Created ${variants.length} ${variants.length === 1 ? 'variant' : 'variants'}.`;
  return { variants, notice };
}
type PendingImage = { src: string; alt: string; option_tags?: OptionTag[] | null };
type PhotoEdit = { slotLabel: string; src: string; alt: string; savedId?: number; pendingIndex?: number };
type ImportedProduct = {
  title: string;
  handle: string;
  body_html: string;
  options: Array<{ name: string; values: string[] }>;
  variants: Array<Pick<Variant, 'title' | 'sku' | 'price' | 'option1' | 'option2' | 'option3' | 'stock'>>;
  images: PendingImage[];
  collection_ids: number[];
};

export default function AdminProductEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === 'new';
  const [title, setTitle] = useState('');
  const [handle, setHandle] = useState('');
  const [vendor, setVendor] = useState('LUUX');
  const [vendorUrl, setVendorUrl] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [body, setBody] = useState('');
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<DraftVariant[]>([]);
  const [images, setImages] = useState<Product['images']>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionIds, setCollectionIds] = useState<number[]>([]);
  const [productId, setProductId] = useState<number | null>(isNew ? null : Number(params.id));
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const [photoEdit, setPhotoEdit] = useState<PhotoEdit | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch('/api/admin/collections')
      .then((res) => res.json())
      .then((data) => setCollections(data.collections || []));
    if (isNew) {
      setVariants([blankVariant({ title: 'Default Title' })]);
      return;
    }
    fetch(`/api/admin/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        const product: Product = data.product;
        setProductId(product.id);
        setTitle(product.title);
        setHandle(product.handle);
        setVendor(product.vendor || 'LUUX');
        setVendorUrl(product.vendor_url || '');
        setVendorContact(product.vendor_contact || '');
        setBody(product.body_html);
        setPublished(product.published);
        setFeatured(product.featured);
        setOptions(product.options);
        setVariants(product.variants.map((variant) => ({ ...variant, _key: `saved-${variant.id}` })));
        setImages(product.images);
        setCollectionIds(product.collections.map((row) => row.id));
      });
  }, [isNew, params.id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const payload = {
      title,
      handle,
      vendor,
      vendor_url: vendorUrl,
      vendor_contact: vendorContact,
      body_html: body,
      published,
      featured,
      options: options.map((option) => ({
        name: option.name,
        values: option.values.map((value) => value.trim()).filter(Boolean),
      })),
      variants: variants.map((variant) => ({
        id: variant.id || undefined,
        title: variant.title,
        sku: variant.sku,
        price: variant.price,
        option1: variant.option1,
        option2: variant.option2,
        option3: variant.option3,
        stock: variant.stock,
        image_id: variant.image_id || null,
      })),
      collection_ids: collectionIds,
    };
    const url = isNew || !productId ? '/api/admin/products' : `/api/admin/products/${productId}`;
    try {
      const response = await fetch(url, {
        method: isNew || !productId ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showSaveNotice(data.error || 'Save failed', 'error');
        if (response.status === 409 && data.product_id && isNew) router.replace(`/admin/products/${data.product_id}`);
        return;
      }
      const savedId = Number(data.product?.id);
      if (savedId) setProductId(savedId);
      if (pendingImages.length && savedId) {
        for (const image of pendingImages) {
          const attached = await fetch(`/api/admin/products/${savedId}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              src: image.src,
              alt: image.alt || title,
              ...(Array.isArray(image.option_tags) ? { option_tags: image.option_tags } : {}),
            }),
          });
          if (!attached.ok) {
            showSaveNotice('Product saved, but a photo could not be attached.', 'error');
            if (isNew) router.replace(`/admin/products/${savedId}`);
            return;
          }
        }
        setPendingImages([]);
      }
      showSaveNotice('Product saved');
      if (isNew && savedId) router.replace(`/admin/products/${savedId}`);
    } catch {
      showSaveNotice('Save failed', 'error');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function readLink() {
    const url = sourceUrl.trim();
    if (!url) {
      showSaveNotice('Paste a product link.', 'error');
      return;
    }
    setReading(true);
    const response = await fetch('/api/admin/products/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await response.json().catch(() => ({}));
    setReading(false);
    if (!response.ok) {
      showSaveNotice(data.error || 'Could not read that product link.', 'error');
      return;
    }
    const product = data.product as ImportedProduct;
    setTitle(product.title || '');
    setHandle(product.handle || '');
    setVendorUrl(url);
    setBody(product.body_html || '');
    setOptions(
      (product.options || []).map((option, index) => ({
        id: Date.now() + index,
        name: option.name,
        position: index + 1,
        values: option.values || [],
      }))
    );
    setVariants(
      (product.variants?.length ? product.variants : [{ title: 'Default Title', sku: '', price: '0.00', option1: null, option2: null, option3: null, stock: 10 }]).map(
        (variant) =>
          blankVariant({
            title: variant.title || 'Default Title',
            sku: variant.sku || '',
            price: variant.price || '0.00',
            option1: variant.option1,
            option2: variant.option2,
            option3: variant.option3,
            stock: Number.isFinite(Number(variant.stock)) ? Number(variant.stock) : 10,
          })
      )
    );
    setPendingImages(product.images || []);
    setCollectionIds(product.collection_ids || []);
    showSaveNotice('Product details are ready to review.');
  }

  async function addDroppedFiles(files: File[]) {
    const imagesOnly = files.filter((file) => file.type.startsWith('image/'));
    if (!imagesOnly.length) {
      showSaveNotice('Drop image files.', 'error');
      return;
    }
    for (const file of imagesOnly) {
      const bodyForm = new FormData();
      bodyForm.set('file', file);
      const uploaded = await fetch('/api/admin/upload', { method: 'POST', body: bodyForm }).then((res) => res.json());
      if (!uploaded.src) {
        showSaveNotice(uploaded.error || 'Upload failed', 'error');
        continue;
      }
      if (productId) {
        const attached = await fetch(`/api/admin/products/${productId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ src: uploaded.src, alt: title }),
        });
        const saved = await attached.json().catch(() => ({}));
        if (!attached.ok || !saved.image) {
          showSaveNotice(saved.error || 'Upload failed', 'error');
          continue;
        }
        setImages((current) => [...current, saved.image]);
      } else {
        setPendingImages((current) => [...current, { src: uploaded.src, alt: title }]);
      }
    }
  }

  async function makeMainSaved(id: number) {
    if (images[0]?.id === id) return;
    const response = await fetch(`/api/admin/images/${id}/main`, { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data.images)) {
      showSaveNotice(data.error || 'Could not set the main photo.', 'error');
      return;
    }
    setImages(data.images);
    showSaveNotice('Main photo updated');
  }

  function makeMainPending(index: number) {
    if (images.length || index <= 0) return;
    setPendingImages((current) => {
      if (index >= current.length) return current;
      const next = current.filter((_, item) => item !== index);
      next.unshift(current[index]);
      return next;
    });
  }

  async function deletePhoto(target: PhotoEdit) {
    if (target.savedId) {
      const response = await fetch(`/api/admin/images/${target.savedId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        showSaveNotice(data.error || 'Could not delete this photo.', 'error');
        return;
      }
      setImages((current) => current.filter((image) => image.id !== target.savedId));
      return;
    }
    if (target.pendingIndex != null) {
      setPendingImages((current) => current.filter((_, index) => index !== target.pendingIndex));
    }
  }

  async function applyPhoto(src: string, optionTags: OptionTag[]) {
    if (!photoEdit) return;
    if (photoEdit.savedId) {
      const response = await fetch(`/api/admin/images/${photoEdit.savedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src, alt: photoEdit.alt || title, option_tags: optionTags }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not replace this photo.');
      if (Array.isArray(data.images)) setImages(data.images);
      else {
        setImages((current) =>
          current.map((image) =>
            image.id === photoEdit.savedId ? { ...image, src: data.image?.src || src, option_tags: optionTags } : image
          )
        );
      }
      if (Array.isArray(data.variants)) {
        setVariants((current) =>
          current.map((row) => {
            const fresh = data.variants.find((variant: Variant) => variant.id === row.id);
            return fresh ? { ...row, image_id: fresh.image_id } : row;
          })
        );
      }
    } else if (photoEdit.pendingIndex != null) {
      const pendingIndex = photoEdit.pendingIndex;
      setPendingImages((current) =>
        current.map((image, index) => (index === pendingIndex ? { ...image, src, option_tags: optionTags } : image))
      );
    }
    setPhotoEdit(null);
    showSaveNotice('Photo updated');
  }

  function generateVariants() {
    const result = variantsFromOptions(options, variants);
    if ('error' in result) {
      showSaveNotice(result.error, 'error');
      return;
    }
    setVariants(result.variants);
    showSaveNotice(result.notice);
  }

  async function payTest() {
    const variant = variants.find((item) => item.id > 0);
    if (!variant) {
      showSaveNotice('Save the product first', 'error');
      return;
    }
    setPaying(true);
    const response = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paytest: true,
        items: [{ variant_id: variant.id, quantity: 1 }],
        email: 'hello@luuxmart.com',
        phone: '+852 0000 0000',
        shipping_same: true,
        invoice_name: 'LUUX test',
        invoice_line1: 'Payment test',
        invoice_city: 'Hong Kong',
        invoice_country: 'ZZ',
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPaying(false);
    if (!response.ok || !data.url) {
      showSaveNotice(data.error || 'Payment could not be started', 'error');
      return;
    }
    window.location.href = data.url;
  }

  async function removeProduct() {
    if (!productId) return;
    setDeleting(true);
    const response = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
    setDeleting(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showSaveNotice(data.error || 'Could not delete this product', 'error');
      return;
    }
    router.push('/admin/products');
  }

  const photoSources = [
    ...images.map((image, index) => ({
      key: `saved-${image.id}`,
      id: image.id,
      slotLabel: `Photo ${index + 1}`,
      option_tags: image.option_tags ?? null,
    })),
    ...pendingImages.map((image, index) => ({
      key: `pending-${index}`,
      id: null,
      slotLabel: `Photo ${images.length + index + 1}`,
      option_tags: image.option_tags ?? null,
    })),
  ];
  const activePhotoKey = photoEdit?.savedId
    ? `saved-${photoEdit.savedId}`
    : photoEdit?.pendingIndex != null
      ? `pending-${photoEdit.pendingIndex}`
      : '';
  const photoTags = effectivePhotoTags(photoSources, options, variants);
  const photoOptionState = {
    initialTags: photoTags.get(activePhotoKey) || [],
    otherClaims: photoSources.flatMap((photo) =>
      photo.key === activePhotoKey
        ? []
        : (photoTags.get(photo.key) || []).map((tag) => ({ ...tag, slotLabel: photo.slotLabel }))
    ),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminPageHeader
        title={isNew ? 'Add product' : 'Edit product'}
        backHref="/admin/products"
        backLabel="Back to products"
        trailing={
          !isNew && productId ? (
            <div className="flex items-center gap-2">
              {handle === 'payment-test' ? (
                <Button helpKey="admin.product.paytest" type="button" disabled={paying} onClick={() => void payTest()}>
                  {paying ? 'Opening Stripe…' : 'Pay US$1 test'}
                </Button>
              ) : null}
              <Button helpKey="admin.product.delete" variant="danger" onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            </div>
          ) : null
        }
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete product"
        message="This lamp will be removed from the shop."
        confirmLabel="Delete"
        confirmHelpKey="admin.confirm.delete"
        cancelHelpKey="admin.confirm.cancel"
        busy={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void removeProduct()}
      />
      {isNew ? (
        <div className="card-panel mb-6 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <TextInput
              label="AI assistant"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void readLink();
                }
              }}
              hint="Paste a product link. Prices stay as shown on that page so you can set them in HKD before saving."
            />
          </div>
          <Button helpKey="admin.product.import" type="button" disabled={reading} onClick={() => void readLink()}>
            {reading ? 'Reading…' : 'Read product'}
          </Button>
        </div>
      ) : null}
      <form onSubmit={save} className="space-y-6">
        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <TextInput label="Company" helpKey="admin.product.vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        <TextInput label="Link" helpKey="admin.product.vendor_url" type="url" inputMode="url" placeholder="https://" value={vendorUrl} onChange={(e) => setVendorUrl(e.target.value)} />
        <TextInput label="Contacts" helpKey="admin.product.vendor_contact" value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} />
        <TextInput label="Handle" value={handle} onChange={(e) => setHandle(e.target.value)} />
        <HtmlField label="Description HTML" rows={8} value={body} onChange={setBody} />
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
          <p className="mb-2 text-sm text-gray-600">Separate values with a comma. Variants use the first three options.</p>
          {options.map((option, index) => (
            <div key={option.id || index} className="mb-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
              <input
                className="input-field"
                placeholder="Option name"
                value={option.name}
                onChange={(e) =>
                  setOptions((current) => current.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))
                }
              />
              <input
                className="input-field"
                placeholder="Values, separated by commas"
                value={option.values.join(', ')}
                onChange={(e) =>
                  setOptions((current) =>
                    current.map((row, i) => (i === index ? { ...row, values: e.target.value.split(',').map((item) => item.trim()) } : row))
                  )
                }
              />
              <Button
                helpKey="admin.option.delete"
                variant="danger"
                aria-label={`Delete option ${option.name || index + 1}`}
                onClick={() =>
                  setOptions((current) =>
                    current.filter((_, i) => i !== index).map((row, position) => ({ ...row, position: position + 1 }))
                  )
                }
              >
                Delete
              </Button>
            </div>
          ))}
          <Button
            helpKey="admin.option.add"
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
            <div key={variant._key || variant.id || index} className="mb-2 grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.5fr)_minmax(0,0.8fr)_auto] md:items-center">
              <input className="input-field" placeholder="Title" value={variant.title} onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)))} />
              <input className="input-field" placeholder="SKU" value={variant.sku} onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, sku: e.target.value } : row)))} />
              <input className="input-field" placeholder="Price" value={variant.price} onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, price: e.target.value } : row)))} />
              <input className="input-field" placeholder="Stock" type="number" value={variant.stock} onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, stock: Number(e.target.value) } : row)))} />
              <input className="input-field" placeholder="Option 1" value={variant.option1 || ''} onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, option1: e.target.value } : row)))} />
              <Button
                helpKey="admin.variant.delete"
                variant="danger"
                aria-label={`Delete variant ${variant.title || index + 1}`}
                onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}
              >
                Delete
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button helpKey="admin.variant.generate" variant="secondary" onClick={generateVariants}>
              Generate variants
            </Button>
            <Button helpKey="admin.variant.add" variant="secondary" onClick={() => setVariants((current) => [...current, blankVariant()])}>
              Add variant
            </Button>
          </div>
        </div>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void addDroppedFiles(Array.from(event.dataTransfer.files));
          }}
          className={`rounded-md border border-dashed p-4 ${dragOver ? 'border-black bg-gray-50' : 'border-gray-300'}`}
        >
          <p className="admin-field-label">Photos</p>
          <div className="mb-3 flex flex-wrap gap-3">
            {images.map((image, index) => {
              const main = index === 0;
              const slotLabel = `Photo ${index + 1}`;
              return (
                <div key={image.id} className="relative pb-6">
                  <HelpButton
                    helpKey="admin.image.edit"
                    className={`block h-20 w-20 overflow-hidden rounded-md border-2 ${main ? 'border-black' : 'border-gray-200'}`}
                    onClick={() => setPhotoEdit({ slotLabel, src: image.src, alt: image.alt, savedId: image.id })}
                  >
                    <img src={image.src} alt="" className="h-20 w-20 object-cover" />
                  </HelpButton>
                  <HelpButton
                    helpKey="admin.image.main"
                    aria-label={main ? 'Main photo' : `Set ${slotLabel} as the main photo`}
                    aria-pressed={main}
                    className={`absolute bottom-0 left-0 right-0 rounded px-1 text-center text-[10px] font-medium leading-5 ${
                      main ? 'bg-black text-white' : 'bg-white text-black ring-1 ring-gray-300'
                    }`}
                    onClick={() => void makeMainSaved(image.id)}
                  >
                    Main
                  </HelpButton>
                  <HelpButton
                    helpKey="admin.image.delete"
                    aria-label="Delete photo"
                    className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-red-600 bg-white text-xs leading-none text-red-600"
                    onClick={() => void deletePhoto({ slotLabel, src: image.src, alt: image.alt, savedId: image.id })}
                  >
                    ×
                  </HelpButton>
                </div>
              );
            })}
            {pendingImages.map((image, index) => {
              const main = images.length === 0 && index === 0;
              const slotLabel = `Photo ${images.length + index + 1}`;
              return (
                <div key={`${image.src}-${index}`} className="relative pb-6">
                  <HelpButton
                    helpKey="admin.image.edit"
                    className={`block h-20 w-20 overflow-hidden rounded-md border-2 ${main ? 'border-black' : 'border-gray-200'}`}
                    onClick={() =>
                      setPhotoEdit({
                        slotLabel,
                        src: image.src,
                        alt: image.alt,
                        pendingIndex: index,
                      })
                    }
                  >
                    <img src={image.src} alt="" className="h-20 w-20 object-cover" />
                  </HelpButton>
                  {images.length === 0 ? (
                    <HelpButton
                      helpKey="admin.image.main"
                      aria-label={main ? 'Main photo' : `Set ${slotLabel} as the main photo`}
                      aria-pressed={main}
                      className={`absolute bottom-0 left-0 right-0 rounded px-1 text-center text-[10px] font-medium leading-5 ${
                        main ? 'bg-black text-white' : 'bg-white text-black ring-1 ring-gray-300'
                      }`}
                      onClick={() => makeMainPending(index)}
                    >
                      Main
                    </HelpButton>
                  ) : null}
                  <HelpButton
                    helpKey="admin.image.delete"
                    aria-label="Delete photo"
                    className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-red-600 bg-white text-xs leading-none text-red-600"
                    onClick={() =>
                      void deletePhoto({
                        slotLabel,
                        src: image.src,
                        alt: image.alt,
                        pendingIndex: index,
                      })
                    }
                  >
                    ×
                  </HelpButton>
                </div>
              );
            })}
          </div>
          <HelpButton helpKey="admin.image.drop" className="text-sm text-gray-600">
            Drop photos here
          </HelpButton>
        </div>
        <Button helpKey="admin.product.save" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save product'}
        </Button>
      </form>
      <ProductPhotoAiEditDialog
        open={Boolean(photoEdit)}
        slotLabel={photoEdit?.slotLabel || 'Photo'}
        sourceSrc={photoEdit?.src || ''}
        options={options}
        initialTags={photoOptionState.initialTags}
        otherClaims={photoOptionState.otherClaims}
        onCancel={() => setPhotoEdit(null)}
        onApply={applyPhoto}
      />
    </div>
  );
}
