import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/products/ProductDetail';
import { loadProduct } from '@/lib/api';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  try {
    const { product } = await loadProduct(handle);
    const text = product.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155);
    return {
      title: product.title,
      description: text || `${product.title} from LUUX. Prices in HKD. Standard Hong Kong delivery is included where shown at checkout.`,
    };
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
