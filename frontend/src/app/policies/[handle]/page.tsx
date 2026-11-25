import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadPage } from '@/lib/api';
import { buildPageMetadata, pageDescription, stripHtml } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  try {
    const { page } = await loadPage(handle);
    const plain = stripHtml(page.body_html).slice(0, 155);
    return buildPageMetadata({
      path: `/policies/${handle}`,
      title: page.title,
      description: pageDescription(handle, plain || `${page.title} — LUUX`),
    });
  } catch {
    return {};
  }
}

export default async function PolicyPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  try {
    const { page } = await loadPage(handle);
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
