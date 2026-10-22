'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpLink } from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import { useCart } from '@/lib/cart';
import type { Collection } from '@/lib/types';

export default function Header({ collections }: { collections: Collection[] }) {
  const router = useRouter();
  const { count } = useCart();
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <nav className="hidden items-center gap-5 text-xs tracking-[0.18em] text-gray-800 md:flex">
          <HelpLink helpKey="nav.home" href="/" className="hover:text-brand">
            HOME
          </HelpLink>
          <div className="relative" onMouseEnter={() => setShopOpen(true)} onMouseLeave={() => setShopOpen(false)}>
            <HelpLink helpKey="nav.shop" href="/collections/pendant" className="hover:text-brand">
              SHOP
            </HelpLink>
            {shopOpen ? (
              <div className="absolute left-0 top-full min-w-[10rem] bg-white py-2 shadow-lg">
                {collections.map((collection) => (
                  <HelpLink
                    key={collection.id}
                    helpKey="nav.shop"
                    href={`/collections/${collection.handle}`}
                    className="block px-4 py-2 text-xs tracking-widest hover:bg-gray-50"
                  >
                    {collection.title}
                  </HelpLink>
                ))}
              </div>
            ) : null}
          </div>
          <HelpLink helpKey="nav.about" href="/pages/about-us" className="hover:text-brand">
            ABOUT US
          </HelpLink>
          <HelpLink helpKey="nav.contact" href="/pages/contact" className="hover:text-brand">
            CONTACT US
          </HelpLink>
        </nav>
        <HelpLink helpKey="nav.logo" href="/" className="mx-auto md:mx-0">
          <img src="/images/luux-mark.svg" alt="LUUX" className="h-8 w-auto" />
        </HelpLink>
        <div className="flex items-center gap-3 text-xs text-gray-700">
          <span className="hidden sm:inline">HKD / EN</span>
          <Button helpKey="nav.search" variant="ghost" className="p-1" onClick={() => setSearchOpen((open) => !open)}>
            Search
          </Button>
          <Button helpKey="nav.account" variant="ghost" href="/account" className="p-1">
            Account
          </Button>
          <Button helpKey="nav.cart" variant="ghost" href="/cart" className="relative p-1">
            Cart{count ? ` (${count})` : ''}
          </Button>
        </div>
      </div>
      {searchOpen ? (
        <form onSubmit={submitSearch} className="border-t border-gray-100 px-4 py-3">
          <div className="mx-auto flex max-w-xl gap-2">
            <input
              className="input-field"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search"
              aria-label="Search"
            />
            <Button helpKey="search.submit" type="submit">
              Search
            </Button>
          </div>
        </form>
      ) : null}
    </header>
  );
}
