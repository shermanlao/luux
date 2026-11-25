import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductCard from '@/components/products/ProductCard';
import JsonLd from '@/components/seo/JsonLd';
import { loadCollection, loadSite } from '@/lib/api';
import { breadcrumbJsonLd, buildPageMetadata, collectionDescription } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  try {
    const [{ collection }, { site }] = await Promise.all([loadCollection(handle), loadSite()]);
    return buildPageMetadata({
      path: `/collections/${handle}`,
      title: collection.title,
      description: collectionDescription(handle, collection.title, site.seo_description),
      image: collection.image || undefined,
    });
  } catch {
    return {};
  }
}

export default async function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  try {
    const { collection, products } = await loadCollection(handle);
    return (
      <div className="w-full px-6 py-10 md:px-10">
        <JsonLd
          data={breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Collections', path: '/collections' },
            { name: collection.title, path: `/collections/${collection.handle}` },
          ])}
        />
        <p className="text-xs tracking-widest text-gray-500">COLLECTIONS</p>
        <h1 className="mt-2 text-3xl">{collection.title}</h1>
        {collection.description ? (
          <div className="prose-luux mt-4 max-w-3xl text-gray-700" dangerouslySetInnerHTML={{ __html: collection.description }} />
        ) : null}
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
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
