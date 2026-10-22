import { notFound } from 'next/navigation';
import ContactForm from '@/components/layout/ContactForm';
import { loadPage } from '@/lib/api';

export default async function CmsPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  try {
    const { page } = await loadPage(handle);
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl">{page.title}</h1>
        <div className="prose-luux mt-6" dangerouslySetInnerHTML={{ __html: page.body_html }} />
        {handle === 'contact' ? <ContactForm /> : null}
      </div>
    );
  } catch {
    notFound();
  }
}
