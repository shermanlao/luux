import { pageCanonicalUrl } from '@/lib/seo';

/**
 * Homepage canonical and og:url must carry a trailing slash. Next.js Metadata strips it on emit,
 * so these tags are rendered from the page and hoisted into <head>.
 */
export default function HomepageUrlHead() {
  const href = pageCanonicalUrl('/');
  return (
    <>
      <link rel="canonical" href={href} />
      <meta property="og:url" content={href} />
    </>
  );
}