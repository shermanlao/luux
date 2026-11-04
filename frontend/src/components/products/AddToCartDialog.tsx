'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import OptionSelects from '@/components/products/OptionSelects';
import Button from '@/components/ui/Button';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import { matchVariant, shopOptions } from '@/lib/variants';
import type { Product } from '@/lib/types';

export default function AddToCartDialog({
  product,
  open,
  onClose,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const { add } = useCart();
  const { format } = useCurrency();
  const options = useMemo(() => (product ? shopOptions(product) : []), [product]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !product) return;
    setSelected(shopOptions(product).map((option) => option.values[0] || ''));
  }, [open, product]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || !product || typeof document === 'undefined') return null;

  const variant = matchVariant(product, selected, options);
  const image =
    product.images.find((row) => row.id === variant?.image_id)?.src || product.images[0]?.src || '/images/luux-mark.svg';

  function addToCart() {
    if (!product || !variant) return;
    add({
      variant_id: variant.id,
      product_id: product.id,
      handle: product.handle,
      title: product.title,
      variant_title: variant.title,
      price: variant.price,
      image,
    });
    onClose();
    showSaveNotice('Added to cart', 'success', {
      label: 'Checkout',
      href: '/checkout',
      helpKey: 'notice.checkout',
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="grid max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white shadow-2xl sm:grid-cols-2"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-center bg-neutral-100 p-6 sm:p-8">
          <img src={image} alt={product.title} className="h-80 w-full object-contain sm:h-[28rem]" />
        </div>
        <div className="flex min-w-0 flex-col p-6 sm:p-8">
          <h2 id={titleId} className="text-2xl font-medium leading-snug">
            {product.title}
          </h2>
          <p className="mt-2 text-lg">{format(variant?.price || product.price)}</p>
          <div className="mt-6">
            <OptionSelects
              options={options}
              selected={selected}
              onChange={(index, value) => setSelected((current) => current.map((item, i) => (i === index ? value : item)))}
            />
          </div>
          <div className="mt-8 flex justify-end gap-3 sm:mt-auto sm:pt-8">
            <Button helpKey="dialog.close" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button helpKey="product.add_to_cart" variant="accent" disabled={!variant || !variant.available} onClick={addToCart}>
              {variant?.available ? 'Add to cart' : 'Sold out'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
