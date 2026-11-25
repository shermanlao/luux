import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductPageContent from '@/components/products/ProductPageContent';
import { loadProduct } from '@/lib/api';
import { buildPageMetadata, productListingDescription } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  try {
    const { product } = await loadProduct(handle);
    const description = productListingDescription(product);
    const image = product.images[0]?.src;
    return buildPageMetadata({
      path: `/products/${handle}`,
      title: product.title,
      description,
      image,
    });
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  try {
    const { product } = await loadProduct(handle);
    return <ProductPageContent product={product} />;
  } catch {
    notFound();
  }
}