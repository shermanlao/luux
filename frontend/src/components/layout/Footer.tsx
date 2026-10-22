'use client';

import { FormEvent, useState } from 'react';
import { HelpLink } from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { SiteSettings } from '@/lib/types';

export default function Footer({ site }: { site: SiteSettings }) {
  const [email, setEmail] = useState('');

  async function subscribe(event: FormEvent) {
    event.preventDefault();
    const response = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showSaveNotice(data.error || 'Could not subscribe', 'error');
      return;
    }
    setEmail('');
    showSaveNotice('You are on the list.');
  }

  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-gray-500">{site.newsletter_heading}</p>
          <p className="mt-2 text-sm text-gray-600">{site.newsletter_body}</p>
          <form onSubmit={subscribe} className="mt-4 flex gap-2">
            <input
              className="input-field"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              aria-label="Email"
            />
            <Button helpKey="home.newsletter" type="submit">
              Sign up
            </Button>
          </form>
        </div>
        <div>
          <img src="/images/luux-mark.svg" alt="LUUX" className="h-8 w-auto" />
          <p className="mt-4 text-sm text-gray-600">{site.contact_email}</p>
          <p className="text-sm text-gray-600">{site.contact_phone}</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-medium">Terms and Policies</p>
          <div className="flex flex-col gap-1">
            <HelpLink helpKey="nav.about" href="/policies/privacy-policy" className="text-gray-600 hover:underline">
              Privacy policy
            </HelpLink>
            <HelpLink helpKey="nav.about" href="/policies/refund-policy" className="text-gray-600 hover:underline">
              Refund policy
            </HelpLink>
            <HelpLink helpKey="nav.about" href="/policies/terms-of-service" className="text-gray-600 hover:underline">
              Terms of service
            </HelpLink>
            <HelpLink helpKey="nav.contact" href="/pages/contact" className="text-gray-600 hover:underline">
              Contact information
            </HelpLink>
          </div>
          <div className="mt-4 flex gap-3 text-gray-600">
            {site.facebook_url ? (
              <HelpLink helpKey="nav.about" href={site.facebook_url} target="_blank" rel="noreferrer">
                Facebook
              </HelpLink>
            ) : null}
            {site.instagram_url ? (
              <HelpLink helpKey="nav.about" href={site.instagram_url} target="_blank" rel="noreferrer">
                Instagram
              </HelpLink>
            ) : null}
            {site.threads_url ? (
              <HelpLink helpKey="nav.about" href={site.threads_url} target="_blank" rel="noreferrer">
                Threads
              </HelpLink>
            ) : null}
            {site.pinterest_url ? (
              <HelpLink helpKey="nav.about" href={site.pinterest_url} target="_blank" rel="noreferrer">
                Pinterest
              </HelpLink>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
