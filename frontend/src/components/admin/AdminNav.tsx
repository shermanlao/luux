'use client';

import { HelpLink } from '@/components/admin/HelpButton';

const LINKS = [
  { href: '/admin', label: 'Dashboard', helpKey: 'admin.nav.dashboard' },
  { href: '/admin/products', label: 'Products', helpKey: 'admin.nav.products' },
  { href: '/admin/collections', label: 'Collections', helpKey: 'admin.nav.collections' },
  { href: '/admin/pages', label: 'Pages', helpKey: 'admin.nav.pages' },
  { href: '/admin/settings', label: 'Settings', helpKey: 'admin.nav.settings' },
  { href: '/admin/shipping', label: 'Shipping', helpKey: 'admin.nav.shipping' },
  { href: '/admin/orders', label: 'Orders', helpKey: 'admin.nav.orders' },
  { href: '/admin/inquiries', label: 'Inquiries', helpKey: 'admin.nav.inquiries' },
];

export default function AdminNav() {
  return (
    <nav className="mb-8 flex flex-wrap gap-4 text-sm">
      {LINKS.map((link) => (
        <HelpLink key={link.href} helpKey={link.helpKey} href={link.href} className="hover:underline">
          {link.label}
        </HelpLink>
      ))}
    </nav>
  );
}
