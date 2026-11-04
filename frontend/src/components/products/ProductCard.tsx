'use client';

import { useState } from 'react';
import { HelpLink } from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import AddToCartDialog from '@/components/products/AddToCartDialog';
import { useCurrency } from '@/lib/currency';
import type { Product } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  const { format } = useCurrency();
  const [open, setOpen] = useState(false);
  const image = product.images[0]?.src || '/images/luux-mark.svg';
  const href = `/products/${product.handle}`;

  return (
    <article className="group">
      <HelpLink helpKey="product.choose" href={href} className="block">
        <div className="aspect-[4/5] overflow-hidden rounded-[10px] bg-neutral-100">
          <img src={image} alt={product.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        </div>
        <h3 className="mt-2 text-[13px] font-normal leading-snug">{product.title}</h3>
        <p className="text-sm text-[#12080c]">{format(product.price)}</p>
      </HelpLink>
      <div className="mt-2">
        <Button helpKey="product.add_to_cart" variant="accent" className="px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>
          Add to cart
        </Button>
      </div>
      <AddToCartDialog product={product} open={open} onClose={() => setOpen(false)} />
    </article>
  );
}
