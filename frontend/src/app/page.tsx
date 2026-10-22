import Button from '@/components/ui/Button';
import ProductCard from '@/components/products/ProductCard';
import { loadFeatured, loadSite } from '@/lib/api';

export default async function HomePage() {
  const [{ site }, featured] = await Promise.all([loadSite(), loadFeatured().catch(() => ({ products: [] }))]);
  const products = featured.products || [];

  return (
    <div>
      <section className="relative min-h-[70vh] bg-neutral-800 text-white">
        {site.hero_image ? (
          <img src={site.hero_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-end px-6 pb-16">
          <p className="mb-4 text-xs tracking-[0.2em] uppercase">Shop our latest arrivals</p>
          <h1 className="max-w-3xl text-5xl font-semibold md:text-6xl">{site.hero_heading}</h1>
          <p className="mt-4 max-w-xl text-lg">{site.hero_subheading}</p>
          <div className="mt-6">
            <Button helpKey="home.shop_now" href={site.hero_cta_href} className="bg-white text-black hover:bg-gray-100">
              {site.hero_cta_label}
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-2xl">{site.featured_heading}</h2>
        <div className="grid grid-cols-products gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-8 md:grid-cols-2">
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
    </div>
  );
}
