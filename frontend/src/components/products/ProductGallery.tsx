'use client';

import { useEffect, useRef } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import type { ProductImage } from '@/lib/types';

export default function ProductGallery({
  images,
  imageId,
  onChange,
  alt,
}: {
  images: ProductImage[];
  imageId: number | null;
  onChange: (id: number) => void;
  alt: string;
}) {
  const index = Math.max(
    0,
    images.findIndex((row) => row.id === imageId)
  );
  const current = images[index] || images[0];
  const thumbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = thumbsRef.current;
    const selected = parent?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!parent || !selected) return;
    const left = selected.offsetLeft - parent.clientWidth / 2 + selected.clientWidth / 2;
    parent.scrollTo({ left, behavior: 'smooth' });
  }, [imageId]);

  if (!current) return <div className="aspect-square rounded-md bg-gray-100" />;

  const go = (delta: number) => {
    if (images.length < 2) return;
    const next = (index + delta + images.length) % images.length;
    onChange(images[next].id);
  };

  return (
    <div className="min-w-0 max-w-full">
      <div className="relative aspect-square w-full max-w-full overflow-hidden rounded-md bg-gray-100">
        <img key={current.id} src={current.src} alt={alt} className="h-full w-full object-contain" />
        {images.length > 1 ? (
          <>
            <HelpButton
              helpKey="product.gallery.prev"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl leading-none shadow"
              aria-label="Previous photo"
              onClick={() => go(-1)}
            >
              ‹
            </HelpButton>
            <HelpButton
              helpKey="product.gallery.next"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl leading-none shadow"
              aria-label="Next photo"
              onClick={() => go(1)}
            >
              ›
            </HelpButton>
          </>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div ref={thumbsRef} className="mt-3 flex w-full max-w-full gap-2 overflow-x-auto pb-1">
          {images.map((row, position) => {
            const active = row.id === current.id;
            return (
              <HelpButton
                key={row.id}
                helpKey="product.gallery.thumb"
                className={`h-16 w-16 shrink-0 overflow-hidden rounded border ${
                  active ? 'border-black' : 'border-transparent'
                }`}
                aria-label={`Photo ${position + 1}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => onChange(row.id)}
              >
                <img src={row.src} alt="" className="h-full w-full object-cover" />
              </HelpButton>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
