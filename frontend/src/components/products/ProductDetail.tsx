'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductGallery from '@/components/products/ProductGallery';
import Button from '@/components/ui/Button';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import { useCart } from '@/lib/cart';
import type { Product, Variant } from '@/lib/types';
import { formatHkd } from '@shared/slugify';

function matchVariant(product: Product, selected: string[], options: Product['options']): Variant | undefined {
  return (
    product.variants.find((row) => {
      const values = [row.option1, row.option2, row.option3];
      return options.every((option, index) => !option.values.length || values[index] === selected[index]);
    }) || product.variants[0]
  );
}

export default function ProductDetail({ product }: { product: Product }) {
  const { add } = useCart();
  const options = product.options.filter((option) => !(option.name === 'Title' && option.values[0] === 'Default Title'));
  const [selected, setSelected] = useState<string[]>(options.map((option) => option.values[0] || ''));
  const variant = useMemo(() => matchVariant(product, selected, options), [options, product, selected]);
  const [photoId, setPhotoId] = useState<number | null>(variant?.image_id || product.images[0]?.id || null);

  useEffect(() => {
    if (variant?.image_id) setPhotoId(variant.image_id);
  }, [variant?.id, variant?.image_id]);

  const image = product.images.find((row) => row.id === photoId)?.src || product.images[0]?.src || '';

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2">
      <ProductGallery images={product.images} imageId={photoId} onChange={setPhotoId} alt={product.title} />
      <div>
        <h1 className="text-3xl">{product.title}</h1>
        <p className="mt-3 text-xl">{formatHkd(variant?.price || product.price)}</p>
        {options.map((option, index) => (
          <div key={option.id} className="mt-6">
            <p className="mb-2 text-sm font-medium">{option.name}</p>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`option-tag ${selected[index] === value ? 'option-tag-on' : ''}`}
                  onClick={() =>
                    setSelected((current) => current.map((item, i) => (i === index ? value : item)))
                  }
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-8">
          <Button
            helpKey="product.add_to_cart"
            disabled={!variant || !variant.available}
            onClick={() => {
              if (!variant) return;
              add({
                variant_id: variant.id,
                product_id: product.id,
                handle: product.handle,
                title: product.title,
                variant_title: variant.title,
                price: variant.price,
                image: image || '',
              });
              showSaveNotice('Added to cart');
            }}
          >
            {variant?.available ? 'Add to cart' : 'Sold out'}
          </Button>
        </div>
        <div className="prose-luux mt-8 text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: product.body_html }} />
      </div>
    </div>
  );
}
