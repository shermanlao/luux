'use client';

import HelpButton from '@/components/admin/HelpButton';

export default function AdminLogoutButton() {
  return (
    <HelpButton
      helpKey="admin.logout"
      className="text-blue-600 hover:underline"
      onClick={async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.assign('/account');
      }}
    >
      Log out
    </HelpButton>
  );
}
