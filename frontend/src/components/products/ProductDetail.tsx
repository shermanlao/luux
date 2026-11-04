'use client';

import { useMemo, useState } from 'react';
import OptionSelects from '@/components/products/OptionSelects';
import ProductGallery from '@/components/products/ProductGallery';
import Button from '@/components/ui/Button';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import { useCart } from '@/lib/cart';
import type { Product } from '@/lib/types';
import { useCurrency } from '@/lib/currency';
import { matchVariant, shopOptions } from '@/lib/variants';

export default function ProductDetail({ product }: { product: Product }) {
  const { add } = useCart();
  const { format } = useCurrency();
  const options = shopOptions(product);
  const [selected, setSelected] = useState<string[]>(options.map((option) => option.values[0] || ''));
  const variant = useMemo(() => matchVariant(product, selected, options), [options, product, selected]);
  const [photoId, setPhotoId] = useState<number | null>(product.images[0]?.id || null);

  const image = product.images.find((row) => row.id === photoId)?.src || product.images[0]?.src || '';

  return (
    <div className="grid w-full min-w-0 gap-8 px-4 py-8 sm:px-6 md:gap-10 md:px-10 lg:grid-cols-2 [&>*]:min-w-0">
      <div className="w-3/4 max-w-full">
        <ProductGallery images={product.images} imageId={photoId} onChange={setPhotoId} alt={product.title} />
      </div>
      <div className="min-w-0">
        <h1 className="text-3xl">{product.title}</h1>
        <p className="mt-3 text-xl">{format(variant?.price || product.price)}</p>
        <div className="mt-6 max-w-sm">
          <OptionSelects
            options={options}
            selected={selected}
            onChange={(index, value) => {
              const next = selected.map((item, i) => (i === index ? value : item));
              setSelected(next);
              const nextVariant = matchVariant(product, next, options);
              if (nextVariant?.image_id) setPhotoId(nextVariant.image_id);
            }}
          />
        </div>
        <div className="mt-8">
          <Button
            helpKey="product.add_to_cart"
            variant="accent"
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
              showSaveNotice('Added to cart', 'success', {
                label: 'Checkout',
                href: '/checkout',
                helpKey: 'notice.checkout',
              });
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
