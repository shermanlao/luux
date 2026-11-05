'use client';

import { FormEvent, useState, type ReactNode } from 'react';
import { HelpLink } from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { SiteSettings } from '@/lib/types';

function SocialGlyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      {children}
    </svg>
  );
}

const SOCIALS: Array<{
  field: 'facebook_url' | 'instagram_url' | 'threads_url' | 'pinterest_url';
  helpKey: string;
  label: string;
  icon: ReactNode;
}> = [
  {
    field: 'facebook_url',
    helpKey: 'footer.facebook',
    label: 'Facebook',
    icon: (
      <SocialGlyph>
        <path
          fill="currentColor"
          d="M14.5 8.5V6.8c0-.6.4-1 1-1H17V3.5h-2.2C12.4 3.5 11 4.9 11 7.3v1.2H9v2.4h2V20h2.6v-9.1h2.1l.4-2.4h-2.5z"
        />
      </SocialGlyph>
    ),
  },
  {
    field: 'instagram_url',
    helpKey: 'footer.instagram',
    label: 'Instagram',
    icon: (
      <SocialGlyph>
        <path
          fill="currentColor"
          d="M8 3.5h8A4.5 4.5 0 0 1 20.5 8v8a4.5 4.5 0 0 1-4.5 4.5H8A4.5 4.5 0 0 1 3.5 16V8A4.5 4.5 0 0 1 8 3.5zm8 1.6H8A2.9 2.9 0 0 0 5.1 8v8A2.9 2.9 0 0 0 8 18.9h8a2.9 2.9 0 0 0 2.9-2.9V8A2.9 2.9 0 0 0 16 5.1zM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8zM17.2 7.4a.9.9 0 1 1-.9-.9.9.9 0 0 1 .9.9z"
        />
      </SocialGlyph>
    ),
  },
  {
    field: 'threads_url',
    helpKey: 'footer.threads',
    label: 'Threads',
    icon: (
      <SocialGlyph>
        <path
          fill="currentColor"
          d="M16.2 11.2c-.2-2.4-1.6-4-3.9-4-2.6 0-4.3 1.9-4.3 4.8 0 2.9 1.7 4.8 4.4 4.8 1.5 0 2.6-.5 3.4-1.5l-1.2-.9c-.5.6-1.2 1-2.1 1-1.5 0-2.5-1.1-2.5-2.8h6.2zm-6.2-.6c.2-1.3.9-2.2 2.1-2.2s1.9.8 2 2.2zM12 3.2A8.8 8.8 0 0 0 3.2 12 8.8 8.8 0 0 0 12 20.8c1.4 0 2.7-.3 3.9-.9l.1 1.6h1.7l.2-3.6A8.7 8.7 0 0 0 20.8 12 8.8 8.8 0 0 0 12 3.2z"
        />
      </SocialGlyph>
    ),
  },
  {
    field: 'pinterest_url',
    helpKey: 'footer.pinterest',
    label: 'Pinterest',
    icon: (
      <SocialGlyph>
        <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          fill="currentColor"
          d="M10.1 16.6V7.4h2.4c2 0 3.2 1 3.2 2.6s-1.2 2.7-3.2 2.7h-1.2v3.9h-1.2zm1.2-5h1.1c1.2 0 1.9-.5 1.9-1.5s-.7-1.5-1.9-1.5h-1.1v3z"
        />
      </SocialGlyph>
    ),
  },
];

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
      <div className="mx-auto grid w-full gap-10 px-6 py-12 md:grid-cols-3 md:px-10">
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
          <img src={site.logo_icon || '/images/luux-mark.jpg'} alt="LUUX" className="h-9 w-9 object-contain" />
          <p className="mt-4 text-sm text-gray-600">{site.contact_email}</p>
          <p className="text-sm text-gray-600">{site.contact_phone}</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-medium">Terms and Policies</p>
          <div className="flex flex-col gap-1">
            <HelpLink helpKey="nav.about" href="/policies/privacy-policy" className="text-gray-600 hover:underline">
              Privacy policy
            </HelpLink>
            <HelpLink helpKey="cookies.policy" href="/policies/cookie-policy" className="text-gray-600 hover:underline">
              Cookie policy
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
          <div className="mt-4 flex flex-wrap gap-2 text-gray-700">
            {SOCIALS.map((social) => {
              const href = site[social.field];
              if (!href) return null;
              return (
                <HelpLink
                  key={social.field}
                  helpKey={social.helpKey}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  ariaLabel={social.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 hover:text-black"
                >
                  {social.icon}
                  <span className="sr-only">{social.label}</span>
                </HelpLink>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
