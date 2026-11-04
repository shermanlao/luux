'use client';

import { ReactNode } from 'react';
import Button from '@/components/ui/Button';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';

export default function AdminPageHeader({
  title,
  actions,
  trailing,
  showLogout = false,
  backHref = '/admin',
  backLabel = 'Back to Admin',
  backHelpKey = 'admin.nav.back',
}: {
  title: string;
  actions?: ReactNode;
  trailing?: ReactNode;
  showLogout?: boolean;
  backHref?: string;
  backLabel?: string;
  backHelpKey?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex items-center gap-4">
        {actions}
        <Button helpKey={backHelpKey} variant="ghost" href={backHref}>
          {backLabel}
        </Button>
        {trailing}
        {showLogout ? <AdminLogoutButton /> : null}
      </div>
    </div>
  );
}
