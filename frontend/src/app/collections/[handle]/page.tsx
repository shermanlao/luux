import { notFound } from 'next/navigation';
import ProductCard from '@/components/products/ProductCard';
import { loadCollection } from '@/lib/api';

export default async function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  try {
    const { collection, products } = await loadCollection(handle);
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-xs tracking-widest text-gray-500">SHOP</p>
        <h1 className="mt-2 text-3xl">{collection.title}</h1>
        {collection.description ? (
          <div className="prose-luux mt-4 max-w-3xl text-gray-700" dangerouslySetInnerHTML={{ __html: collection.description }} />
        ) : null}
        <div className="mt-10 grid grid-cols-products gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
