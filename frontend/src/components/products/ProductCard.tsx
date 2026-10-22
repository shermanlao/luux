'use client';

import { HelpLink } from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import { formatHkd } from '@shared/slugify';
import type { Product } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  const image = product.images[0]?.src || '/images/luux-mark.svg';
  return (
    <article className="group">
      <HelpLink helpKey="product.choose" href={`/products/${product.handle}`} className="block">
        <div className="aspect-square overflow-hidden rounded-md bg-gray-100">
          <img src={image} alt={product.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        </div>
        <h3 className="mt-3 text-sm font-medium">{product.title}</h3>
        <p className="text-sm text-gray-600">{formatHkd(product.price)}</p>
      </HelpLink>
      <div className="mt-2">
        <Button helpKey="product.choose" variant="secondary" href={`/products/${product.handle}`} className="text-sm">
          Choose
        </Button>
      </div>
    </article>
  );
}
