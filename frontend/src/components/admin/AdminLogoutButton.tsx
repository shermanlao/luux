'use client';

import { useRouter } from 'next/navigation';
import HelpButton from '@/components/admin/HelpButton';

export default function AdminLogoutButton() {
  const router = useRouter();
  return (
    <HelpButton
      helpKey="admin.logout"
      className="text-blue-600 hover:underline"
      onClick={async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.push('/admin/login');
        router.refresh();
      }}
    >
      Log out
    </HelpButton>
  );
}
