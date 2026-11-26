import type { Metadata } from 'next';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/products/ProductCard';
import JsonLd from '@/components/seo/JsonLd';
import ShopFacts from '@/components/shop/ShopFacts';
import { loadFeatured, loadSite } from '@/lib/api';
import { buildPageMetadata, homePageDescription, organizationJsonLd } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await loadSite().catch(() => ({
    site: { seo_title: 'LUUX', seo_description: 'Modern lighting for living spaces.', hero_image: '' } as never,
  }));
  return buildPageMetadata({
    path: '/',
    title: site.seo_title?.trim() || 'LUUX',
    description: homePageDescription(site.seo_description || ''),
    image: site.hero_image || '/images/luux-mark.jpg',
  });
}

export default async function HomePage() {
  const [{ site }, featured] = await Promise.all([loadSite(), loadFeatured().catch(() => ({ products: [] }))]);
  const products = featured.products || [];

  return (
    <div>
      <JsonLd data={organizationJsonLd(site)} />
      <section className="relative min-h-[70vh] bg-neutral-900 text-[#f4f0f2]">
        {site.hero_image ? (
          <img
            src={site.hero_image}
            alt="LUUX modern lighting in a living space"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="relative mx-auto flex min-h-[70vh] w-full flex-col justify-end px-6 pb-16 md:px-10">
          <h1 className="max-w-3xl text-5xl font-semibold md:text-6xl">{site.hero_heading}</h1>
          <p className="mt-4 max-w-xl text-lg">{site.hero_subheading}</p>
          <div className="mt-6">
            <Button helpKey="home.shop_now" href={site.hero_cta_href} className="bg-[#dfd2d7] px-6 py-4 text-[#12080c] hover:bg-[#d4c4cb]">
              {site.hero_cta_label}
            </Button>
          </div>
        </div>
      </section>

      <section className="w-full px-6 py-12 md:px-10">
        <h2 className="mb-6 text-2xl font-normal">{site.featured_heading}</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="grid w-full gap-10 px-6 py-8 md:grid-cols-2 md:px-10">
        <div>
          <p className="text-lg leading-relaxed text-gray-700">{site.story_body}</p>
          <div className="mt-4">
            <Button helpKey="home.learn_more" variant="secondary" href="/pages/about-us">
              Learn more
            </Button>
          </div>
        </div>
        <div>
          <h2 className="text-2xl">{site.shop_heading}</h2>
          <p className="mt-4 leading-relaxed text-gray-700">{site.shop_body}</p>
          <div className="mt-4">
            <Button helpKey="home.learn_more" variant="secondary" href="/collections/pendant">
              Learn more
            </Button>
          </div>
        </div>
      </section>

      {site.sanctuary_heading ? (
        <section className="mx-auto max-w-3xl px-4 py-16 text-center text-2xl leading-snug">{site.sanctuary_heading}</section>
      ) : null}

      <section className="mx-auto max-w-3xl px-6 pb-16 md:px-10">
        <ShopFacts />
      </section>
    </div>
  );
}
