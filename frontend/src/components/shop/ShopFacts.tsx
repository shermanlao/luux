import { SHOP_FACTS_BLURB } from '@/lib/seo';

export default function ShopFacts({ className = '' }: { className?: string }) {
  return (
    <p className={`text-sm leading-relaxed text-gray-600 ${className}`.trim()} data-citation="luux-facts">
      {SHOP_FACTS_BLURB}
    </p>
  );
}