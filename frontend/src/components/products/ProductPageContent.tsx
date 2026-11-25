import ProductDetail from '@/components/products/ProductDetail';
import JsonLd from '@/components/seo/JsonLd';
import ShopFacts from '@/components/shop/ShopFacts';
import type { Product } from '@/lib/types';
import { breadcrumbJsonLd, productIsSpecHeavy, productJsonLd, productListingDescription } from '@/lib/seo';

export default function ProductPageContent({ product }: { product: Product }) {
  const intro = productIsSpecHeavy(product) ? productListingDescription(product) : '';
  return (
    <>
      <JsonLd
        data={[
          productJsonLd(product),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: product.title, path: `/products/${product.handle}` },
          ]),
        ]}
      />
      <ProductDetail product={product} intro={intro} />
      <section className="mx-auto max-w-3xl px-4 pb-12 md:px-10">
        <ShopFacts />
      </section>
    </>
  );
}