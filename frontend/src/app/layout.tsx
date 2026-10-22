import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SaveNotice from '@/components/ui/SaveNotice';
import { CartProvider } from '@/lib/cart';
import { loadSite, siteOrigin } from '@/lib/api';
import type { SitePayload } from '@/lib/types';

const inter = Inter({ subsets: ['latin'] });

const fallbackSite: SitePayload = {
  site: {
    company_name: 'LUUX',
    slogan: '',
    hero_heading: 'Illuminate your space',
    hero_subheading: 'Embrace elegance through modern lighting design.',
    hero_image: '',
    hero_cta_label: 'Shop now',
    hero_cta_href: '/collections/pendant',
    featured_heading: 'Featured products',
    featured_handles: [],
    story_heading: '',
    story_body: '',
    shop_heading: 'Our shop',
    shop_body: '',
    sanctuary_heading: '',
    newsletter_heading: 'Join our community',
    newsletter_body: 'Subscribe for exclusive insights and design tips.',
    contact_email: 'hello@luuxmart.com',
    contact_phone: '+852 6898 8613',
    contact_address: 'Hong Kong',
    facebook_url: '',
    instagram_url: '',
    threads_url: '',
    pinterest_url: '',
    seo_title: 'LUUX',
    seo_description: 'Modern lighting for living spaces.',
    logo_icon: '/images/luux-mark.svg',
  },
  collections: [],
};

export async function generateMetadata(): Promise<Metadata> {
  let payload = fallbackSite;
  try {
    payload = await loadSite();
  } catch {
    /* API may be starting */
  }
  return {
    metadataBase: new URL(siteOrigin()),
    title: { default: payload.site.seo_title || 'LUUX', template: `%s | ${payload.site.company_name}` },
    description: payload.site.seo_description,
    icons: payload.site.logo_icon ? { icon: payload.site.logo_icon } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let payload = fallbackSite;
  try {
    payload = await loadSite();
  } catch {
    /* keep defaults */
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <Header collections={payload.collections} />
          <main className="min-h-[70vh]">{children}</main>
          <Footer site={payload.site} />
          <SaveNotice />
        </CartProvider>
      </body>
    </html>
  );
}
