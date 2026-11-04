'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { HelpLink } from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import type { Collection } from '@/lib/types';

export default function Header({ collections, logo }: { collections: Collection[]; logo?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { count } = useCart();
  const { currencies, code, setCode } = useCurrency();
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');
  const [accountHref, setAccountHref] = useState('/account');
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((res) => {
        if (!cancelled && res.ok) setAccountHref('/admin');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!currencyOpen) return;
    function onPointer(event: MouseEvent) {
      if (!currencyRef.current?.contains(event.target as Node)) setCurrencyOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setCurrencyOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [currencyOpen]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full min-w-0 items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 md:px-10">
        <Button
          helpKey="nav.menu"
          variant="ghost"
          className="p-1 hover:no-underline md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <svg viewBox="0 0 14 14" className="h-5 w-5" aria-hidden="true">
              <path d="M12 2L2 12M12 12L2 2" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 14 14" className="h-5 w-5" aria-hidden="true">
              <path d="M1 3.5H13M1 10.5H13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
          )}
        </Button>
        <nav className="hidden items-center gap-5 text-xs tracking-[0.18em] text-gray-800 md:flex">
          <HelpLink helpKey="nav.home" href="/" className="hover:text-brand">
            HOME
          </HelpLink>
          <div className="relative" onMouseEnter={() => setShopOpen(true)} onMouseLeave={() => setShopOpen(false)}>
            <HelpLink helpKey="nav.shop" href="/collections" className="hover:text-brand">
              COLLECTIONS
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
          <HelpLink helpKey="nav.contact" href="/pages/contact" className="hover:text-brand">
            CONTACT US
          </HelpLink>
        </nav>
        <HelpLink helpKey="nav.logo" href="/" className="mx-auto md:mx-0">
          <img src={logo || '/images/luux-logo.jpg'} alt="LUUX" className="h-[35px] w-auto object-contain" />
        </HelpLink>
        <div className="flex min-w-0 items-center gap-1 text-xs text-gray-700 sm:gap-3">
          <div className="relative" ref={currencyRef}>
            <Button
              helpKey="nav.currency"
              variant="ghost"
              className="p-1 text-xs tracking-wide"
              aria-label={`${code} currency. The site stays in English.`}
              aria-expanded={currencyOpen}
              aria-haspopup="listbox"
              onClick={() => setCurrencyOpen((open) => !open)}
            >
              {code} / EN
            </Button>
            {currencyOpen ? (
              <div role="listbox" aria-label="Currency" className="absolute right-0 top-full z-50 max-h-80 w-56 overflow-auto bg-white py-2 shadow-lg">
                {currencies.map((row) => (
                  <Button
                    key={row.code}
                    helpKey="nav.currency"
                    variant="ghost"
                    role="option"
                    aria-selected={row.code === code}
                    className={`block w-full px-4 py-2 text-left text-xs hover:bg-gray-50 ${row.code === code ? 'font-medium' : ''}`}
                    onClick={() => {
                      setCode(row.code);
                      setCurrencyOpen(false);
                    }}
                  >
                    {row.code} · {row.name}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <Button helpKey="nav.search" variant="ghost" className="p-1" aria-label="Search" onClick={() => setSearchOpen((open) => !open)}>
            <img src="/images/icon-search.svg" alt="" className="h-5 w-5" />
          </Button>
          <Button helpKey="nav.account" variant="ghost" href={accountHref} className="p-1" aria-label="Account">
            <img src="/images/icon-account.svg" alt="" className="h-5 w-5" />
          </Button>
          <Button helpKey="nav.cart" variant="ghost" href="/cart" className="relative p-1" aria-label={count ? `Cart, ${count} items` : 'Cart'}>
            <img src="/images/icon-cart.svg" alt="" className="h-5 w-5" />
            {count ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] text-white">
                {count}
              </span>
            ) : null}
          </Button>
        </div>
      </div>
      {menuOpen ? (
        <nav className="border-t border-gray-100 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-sm tracking-[0.18em] text-gray-800">
            <HelpLink helpKey="nav.home" href="/" className="hover:text-brand">
              HOME
            </HelpLink>
            <div>
              <HelpLink helpKey="nav.shop" href="/collections" className="hover:text-brand">
                COLLECTIONS
              </HelpLink>
              <div className="mt-3 flex flex-col gap-3 pl-4 text-xs">
                {collections.map((collection) => (
                  <HelpLink
                    key={collection.id}
                    helpKey="nav.shop"
                    href={`/collections/${collection.handle}`}
                    className="hover:text-brand"
                  >
                    {collection.title}
                  </HelpLink>
                ))}
              </div>
            </div>
            <HelpLink helpKey="nav.contact" href="/pages/contact" className="hover:text-brand">
              CONTACT US
            </HelpLink>
          </div>
        </nav>
      ) : null}
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
