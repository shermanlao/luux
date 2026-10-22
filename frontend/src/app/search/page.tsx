import ProductCard from '@/components/products/ProductCard';
import { loadSearch } from '@/lib/api';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const data = q ? await loadSearch(q) : { products: [], q: '' };
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl">Search</h1>
      <p className="mt-2 text-gray-600">{q ? `${data.products.length} results for “${q}”` : 'Type a product name in the header search.'}</p>
      <div className="mt-10 grid grid-cols-products gap-8">
        {data.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
