import type { Metadata } from 'next';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
      <img src="/images/luux-mark.jpg" alt="" className="h-14 w-14 object-contain" />
      <p className="mt-6 text-sm uppercase tracking-[0.25em] text-gray-500">404</p>
      <h1 className="mt-3 text-3xl">Page not found</h1>
      <p className="mt-3 text-gray-600">This lamp or page is not on the shop.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button helpKey="nav.home" href="/">
          Home
        </Button>
        <Button helpKey="nav.shop" variant="secondary" href="/collections">
          Collections
        </Button>
      </div>
    </div>
  );
}
