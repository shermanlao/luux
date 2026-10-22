import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl">Page not found</h1>
      <p className="mt-3 text-gray-600">This lamp or page is not on the shop.</p>
      <div className="mt-6">
        <Button helpKey="nav.home" href="/">
          Home
        </Button>
      </div>
    </div>
  );
}
