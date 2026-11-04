import { HelpLink } from '@/components/admin/HelpButton';
import { loadCollections } from '@/lib/api';

export default async function CollectionsIndexPage() {
  const collections = await loadCollections();
  return (
    <div className="w-full px-6 py-10 md:px-10">
      <h1 className="text-5xl font-normal">Collections</h1>
      <div className="mt-8 grid grid-cols-1 gap-x-3 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
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
