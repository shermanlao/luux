import { notFound, redirect } from 'next/navigation';
import ContactForm from '@/components/layout/ContactForm';
import { loadPage } from '@/lib/api';
import type { Page } from '@/lib/types';

export default async function CmsPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (handle === 'about-us') redirect('/pages/contact');
  try {
    const { page } = await loadPage(handle);
    if (handle === 'contact') {
      let about: Page | null = null;
      try {
        about = (await loadPage('about-us')).page;
      } catch {
        about = null;
      }
      return (
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
          <section className="min-w-0">
            {about ? (
              <>
                <h1 className="text-3xl">{about.title}</h1>
                <div className="prose-luux mt-6" dangerouslySetInnerHTML={{ __html: about.body_html }} />
              </>
            ) : null}
          </section>
          <section className="min-w-0">
            <h1 className="text-3xl">{page.title}</h1>
            <div className="prose-luux mt-6" dangerouslySetInnerHTML={{ __html: page.body_html }} />
            <ContactForm />
          </section>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl">{page.title}</h1>
        <div className="prose-luux mt-6" dangerouslySetInnerHTML={{ __html: page.body_html }} />
      </div>
    );
  } catch {
    notFound();
  }
}
