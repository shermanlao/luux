import Button from '@/components/ui/Button';

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl">Checkout cancelled</h1>
      <p className="mt-3 text-gray-600">No payment was taken. You can return to the cart and try again.</p>
      <div className="mt-8">
        <Button helpKey="cart.checkout" href="/cart">
          Back to cart
        </Button>
      </div>
    </div>
  );
}
