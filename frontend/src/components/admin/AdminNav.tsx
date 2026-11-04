'use client';

import { usePathname } from 'next/navigation';
import { HelpLink } from '@/components/admin/HelpButton';

const LINKS = [
  { href: '/admin', label: 'Dashboard', helpKey: 'admin.nav.dashboard' },
  { href: '/admin/products', label: 'Products', helpKey: 'admin.nav.products' },
  { href: '/admin/collections', label: 'Collections', helpKey: 'admin.nav.collections' },
  { href: '/admin/pages', label: 'Pages', helpKey: 'admin.nav.pages' },
  { href: '/admin/settings', label: 'Settings', helpKey: 'admin.nav.settings' },
  { href: '/admin/integrations', label: 'Integrations', helpKey: 'admin.nav.integrations' },
  { href: '/admin/marketing', label: 'Marketing', helpKey: 'admin.nav.marketing' },
  { href: '/admin/shipping', label: 'Shipping', helpKey: 'admin.nav.shipping' },
  { href: '/admin/orders', label: 'Orders', helpKey: 'admin.nav.orders' },
  { href: '/admin/messages', label: 'Messages', helpKey: 'admin.nav.inquiries' },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 text-sm" aria-label="Admin">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <HelpLink
            key={link.href}
            helpKey={link.helpKey}
            href={link.href}
            ariaLabel={link.label}
            className={`rounded px-3 py-2 ${active ? 'bg-black font-medium text-white' : 'hover:bg-gray-100'}`}
          >
            {link.label}
          </HelpLink>
        );
      })}
    </nav>
  );
}
