'use client';

import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';

export default function CartPage() {
  const { lines, subtotal, setQuantity, remove } = useCart();
  const { format } = useCurrency();

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-6 text-3xl">Cart</h1>
        <EmptyState>
          Your cart is empty.
          <div className="mt-4">
            <Button helpKey="home.shop_now" href="/collections/pendant">
              Shop now
            </Button>
          </div>
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl">Cart</h1>
      <div className="space-y-4">
        {lines.map((line) => (
          <div key={line.variant_id} className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4">
            {line.image ? <img src={line.image} alt="" className="h-20 w-20 shrink-0 object-cover" /> : null}
            <div className="min-w-0 flex-1 basis-40">
              <p className="font-medium">{line.title}</p>
              {line.variant_title !== 'Default Title' ? <p className="text-sm text-gray-500">{line.variant_title}</p> : null}
              <p className="text-sm">{format(line.price)}</p>
            </div>
            <input
              className="input-field w-20"
              type="number"
              min={1}
              value={line.quantity}
              onChange={(event) => setQuantity(line.variant_id, Number(event.target.value))}
            />
            <Button helpKey="cart.remove" variant="ghost" onClick={() => remove(line.variant_id)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-8 space-y-3">
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>{format(subtotal)}</span>
        </p>
        <p className="text-sm text-gray-600">
          Enter your delivery address at checkout to see shipping. Shipping is not included in this subtotal until then.
        </p>
        <p className="flex justify-between text-lg font-medium">
          <span>Subtotal due at checkout</span>
          <span>{format(subtotal)}</span>
        </p>
        <div className="flex justify-end pt-2">
          <Button helpKey="cart.checkout" href="/checkout">
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}