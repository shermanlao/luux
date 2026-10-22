import { notFound } from 'next/navigation';
import ProductDetail from '@/components/products/ProductDetail';
import { loadProduct } from '@/lib/api';

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  try {
    const { product } = await loadProduct(handle);
    return <ProductDetail product={product} />;
  } catch {
    notFound();
  }
}
