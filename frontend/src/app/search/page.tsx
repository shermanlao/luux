import ProductCard from '@/components/products/ProductCard';
import Button from '@/components/ui/Button';
import { loadSearch } from '@/lib/api';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const data = q ? await loadSearch(q) : { products: [], q: '' };
  const count = data.products.length;
  const summary = q
    ? `${count} ${count === 1 ? 'result' : 'results'} for “${q}”`
    : 'Type a product name.';
  return (
    <div className="w-full px-6 py-10 md:px-10">
      <h1 className="text-3xl">Search</h1>
      <form action="/search" className="mt-6 flex max-w-xl gap-2">
        <input
          className="input-field min-w-0 flex-1"
          name="q"
          defaultValue={q}
          placeholder="Search"
          aria-label="Search"
          autoFocus
        />
        <Button helpKey="search.submit" type="submit">
          Search
        </Button>
      </form>
      <p className="mt-4 text-gray-600">{summary}</p>
      <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {data.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
