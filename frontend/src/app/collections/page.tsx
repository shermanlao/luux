import { HelpLink } from '@/components/admin/HelpButton';
import { loadCollections } from '@/lib/api';

export default async function CollectionsIndexPage() {
  const collections = await loadCollections();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl">Shop</h1>
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <HelpLink key={collection.id} helpKey="nav.shop" href={`/collections/${collection.handle}`} className="block">
            <div className="aspect-[4/3] overflow-hidden rounded-md bg-gray-100">
              {collection.image ? (
                <img src={collection.image} alt={collection.title} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <h2 className="mt-3 text-lg tracking-widest">{collection.title}</h2>
            <p className="text-sm text-gray-500">{collection.products_count} products</p>
          </HelpLink>
        ))}
      </div>
    </div>
  );
}
