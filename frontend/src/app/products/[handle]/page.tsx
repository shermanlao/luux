import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/products/ProductDetail';
import { loadProduct } from '@/lib/api';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  try {
    const { product } = await loadProduct(handle);
    return { title: product.title };
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  try {
    const { product } = await loadProduct(handle);
    return <ProductDetail product={product} />;
  } catch {
    notFound();
  }
}
