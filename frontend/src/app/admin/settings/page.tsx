'use client';

import { FormEvent, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import { TextInput, TextareaField } from '@/components/ui/FormField';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { SiteSettings } from '@/lib/types';

type MailSettings = {
  mail_smtp_host: string;
  mail_smtp_port: string;
  mail_smtp_secure: boolean;
  mail_smtp_user: string;
  mail_smtp_password: string;
  mail_smtp_password_set: boolean;
  mail_smtp_password_hint: string;
  mail_from_name: string;
  mail_from_email: string;
  mail_imap_host: string;
  mail_imap_port: string;
  mail_imap_secure: boolean;
  mail_imap_user: string;
  mail_imap_password: string;
  mail_imap_password_set: boolean;
  mail_imap_password_hint: string;
  mail_api_token: string;
  mail_api_token_set: boolean;
  mail_api_token_hint: string;
  mail_webhook_secret: string;
  mail_webhook_secret_set: boolean;
  mail_webhook_secret_hint: string;
};

const EMPTY_MAIL: MailSettings = {
  mail_smtp_host: '',
  mail_smtp_port: '587',
  mail_smtp_secure: false,
  mail_smtp_user: '',
  mail_smtp_password: '',
  mail_smtp_password_set: false,
  mail_smtp_password_hint: '',
  mail_from_name: '',
  mail_from_email: '',
  mail_imap_host: '',
  mail_imap_port: '993',
  mail_imap_secure: true,
  mail_imap_user: '',
  mail_imap_password: '',
  mail_imap_password_set: false,
  mail_imap_password_hint: '',
  mail_api_token: '',
  mail_api_token_set: false,
  mail_api_token_hint: '',
  mail_webhook_secret: '',
  mail_webhook_secret_set: false,
  mail_webhook_secret_hint: '',
};

function applyMail(mail?: Partial<MailSettings>): MailSettings {
  return {
    ...EMPTY_MAIL,
    ...mail,
    mail_smtp_port: mail?.mail_smtp_port || '587',
    mail_imap_port: mail?.mail_imap_port || '993',
    mail_smtp_secure: Boolean(mail?.mail_smtp_secure),
    mail_imap_secure: mail?.mail_imap_secure !== false,
    mail_smtp_password: '',
    mail_imap_password: '',
    mail_api_token: '',
    mail_webhook_secret: '',
  };
}

function passwordHint(set: boolean, hint: string): string {
  if (!set) return 'Not saved yet. Leave blank later to keep the current password.';
  return `Saved password ending ${hint}. Leave blank to keep it.`;
}

export default function AdminSettingsPage() {
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [mail, setMail] = useState<MailSettings | null>(null);
  const [checkingApi, setCheckingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        setSite(data.site);
        setMail(applyMail(data.mail));
      });
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!site || !mail) return;
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...site,
        mail_smtp_host: mail.mail_smtp_host,
        mail_smtp_port: mail.mail_smtp_port,
        mail_smtp_secure: mail.mail_smtp_secure,
        mail_smtp_user: mail.mail_smtp_user,
        mail_smtp_password: mail.mail_smtp_password,
        mail_from_name: mail.mail_from_name,
        mail_from_email: mail.mail_from_email,
        mail_imap_host: mail.mail_imap_host,
        mail_imap_port: mail.mail_imap_port,
        mail_imap_secure: mail.mail_imap_secure,
        mail_imap_user: mail.mail_imap_user,
        mail_imap_password: mail.mail_imap_password,
        mail_api_token: mail.mail_api_token,
        mail_webhook_secret: mail.mail_webhook_secret,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showSaveNotice(data.error || 'Could not save settings', 'error');
      return;
    }
    if (data.site) setSite(data.site);
    if (data.mail) setMail(applyMail(data.mail));
    showSaveNotice('Settings saved');
  }

  if (!site || !mail) return null;

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSite((current) => (current ? { ...current, [key]: value } : current));
  }

  function setMailField<K extends keyof MailSettings>(key: K, value: MailSettings[K]) {
    setMail((current) => (current ? { ...current, [key]: value } : current));
  }

  async function checkApi() {
    if (!mail) return;
    setCheckingApi(true);
    setApiStatus('');
    try {
      const response = await fetch('/api/admin/settings/mail-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail_api_token: mail.mail_api_token }),
      });
      const data = await response.json().catch(() => ({}));
      setApiStatus(response.ok && data.address ? `Connected to ${data.address}.` : data.error || 'Could not reach the mail API.');
    } catch {
      setApiStatus('Could not reach the mail API.');
    } finally {
      setCheckingApi(false);
    }
  }

  return (
    <div className="w-full px-6 py-10">
      <AdminPageHeader title="Settings" />
      <form onSubmit={save} className="grid items-start gap-x-8 gap-y-4 lg:grid-cols-2 [&>button]:col-span-full [&>h2]:col-span-full [&>p]:col-span-full">
        <TextInput label="Company" value={site.company_name} onChange={(e) => set('company_name', e.target.value)} />
        <TextInput label="Announcement" value={site.slogan} onChange={(e) => set('slogan', e.target.value)} />
        <TextInput label="Hero heading" value={site.hero_heading} onChange={(e) => set('hero_heading', e.target.value)} />
        <TextInput label="Hero subheading" value={site.hero_subheading} onChange={(e) => set('hero_subheading', e.target.value)} />
        <TextInput label="Hero image path" value={site.hero_image} onChange={(e) => set('hero_image', e.target.value)} />
        <TextInput label="Hero button" value={site.hero_cta_label} onChange={(e) => set('hero_cta_label', e.target.value)} />
        <TextInput label="Hero link" value={site.hero_cta_href} onChange={(e) => set('hero_cta_href', e.target.value)} />
        <TextInput
          label="Featured handles (comma separated)"
          value={site.featured_handles.join(', ')}
          onChange={(e) => set('featured_handles', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
        />
        <TextareaField className="lg:col-span-2" label="Story" rows={4} value={site.story_body} onChange={(e) => set('story_body', e.target.value)} />
        <TextInput label="Shop heading" value={site.shop_heading} onChange={(e) => set('shop_heading', e.target.value)} />
        <TextareaField className="lg:col-span-2" label="Shop body" rows={4} value={site.shop_body} onChange={(e) => set('shop_body', e.target.value)} />
        <TextareaField className="lg:col-span-2" label="Sanctuary heading" rows={3} value={site.sanctuary_heading} onChange={(e) => set('sanctuary_heading', e.target.value)} />
        <TextInput label="Email" value={site.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
        <TextInput label="Phone" value={site.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
        <TextInput label="Address" value={site.contact_address} onChange={(e) => set('contact_address', e.target.value)} />
        <TextInput label="Facebook" value={site.facebook_url} onChange={(e) => set('facebook_url', e.target.value)} />
        <TextInput label="Instagram" value={site.instagram_url} onChange={(e) => set('instagram_url', e.target.value)} />
        <TextInput label="Threads" helpKey="admin.settings.threads" value={site.threads_url} onChange={(e) => set('threads_url', e.target.value)} />
        <TextInput label="Pinterest" helpKey="admin.settings.pinterest" value={site.pinterest_url} onChange={(e) => set('pinterest_url', e.target.value)} />
        <TextInput label="Header logo" value={site.logo} onChange={(e) => set('logo', e.target.value)} />
        <TextInput label="Browser icon" value={site.logo_icon} onChange={(e) => set('logo_icon', e.target.value)} />
        <TextInput label="SEO title" value={site.seo_title} onChange={(e) => set('seo_title', e.target.value)} />
        <TextareaField className="lg:col-span-2" label="SEO description" rows={3} value={site.seo_description} onChange={(e) => set('seo_description', e.target.value)} />
        <TextareaField className="lg:col-span-2" label="Cookie notice" rows={3} value={site.cookie_notice} onChange={(e) => set('cookie_notice', e.target.value)} />
        <h2 className="pt-4 text-xl font-semibold">Email</h2>
        <p className="text-sm text-gray-600">
          Paste the token from Hostinger → Emails → Agentic mail → API access. That token is the mail setup. Messages can send replies and read the inbox without an SMTP or IMAP server. A blank token keeps the saved one.
        </p>
        <TextInput
          label="Agentic Mail API token"
          helpKey="admin.settings.mail_api_token"
          type="password"
          autoComplete="new-password"
          hint={passwordHint(mail.mail_api_token_set, mail.mail_api_token_hint).replace('password', 'token')}
          value={mail.mail_api_token}
          onChange={(e) => setMailField('mail_api_token', e.target.value)}
        />
        <Button helpKey="admin.settings.mail_api_check" type="button" variant="secondary" disabled={checkingApi} onClick={() => void checkApi()}>
          {checkingApi ? 'Checking…' : 'Check API'}
        </Button>
        {apiStatus ? <p className="text-sm text-gray-600">{apiStatus}</p> : null}
        <TextInput
          label="Mail webhook secret"
          helpKey="admin.settings.mail_webhook"
          type="password"
          autoComplete="new-password"
          hint={passwordHint(mail.mail_webhook_secret_set, mail.mail_webhook_secret_hint).replace('password', 'secret').replace('token', 'secret')}
          value={mail.mail_webhook_secret}
          onChange={(e) => setMailField('mail_webhook_secret', e.target.value)}
        />
        <p className="text-sm text-gray-600">
          In Hostinger, add a webhook for new mail aimed at https://luuxmart.com/api/mail/webhook and paste the secret here. A blank secret keeps the saved one.
        </p>
        <p className="text-sm text-gray-600">
          Server mail is optional. Leave these fields empty while the API token above is saved. A blank password keeps the saved one.
        </p>
        <TextInput label="SMTP host" value={mail.mail_smtp_host} onChange={(e) => setMailField('mail_smtp_host', e.target.value)} />
        <TextInput
          label="SMTP port"
          hint="587 for STARTTLS. 465 when SSL is on."
          value={mail.mail_smtp_port}
          onChange={(e) => setMailField('mail_smtp_port', e.target.value)}
        />
        <ToggleSwitch
          helpKey="admin.settings.smtp_secure"
          label="SMTP SSL"
          checked={mail.mail_smtp_secure}
          onChange={(next) => setMailField('mail_smtp_secure', next)}
        />
        <TextInput label="SMTP username" value={mail.mail_smtp_user} onChange={(e) => setMailField('mail_smtp_user', e.target.value)} autoComplete="off" />
        <TextInput
          label="SMTP password"
          helpKey="admin.settings.smtp_password"
          type="password"
          autoComplete="new-password"
          hint={passwordHint(mail.mail_smtp_password_set, mail.mail_smtp_password_hint)}
          value={mail.mail_smtp_password}
          onChange={(e) => setMailField('mail_smtp_password', e.target.value)}
        />
        <TextInput label="From name" value={mail.mail_from_name} onChange={(e) => setMailField('mail_from_name', e.target.value)} />
        <TextInput
          label="From address"
          type="email"
          hint="Leave blank to send from the SMTP username."
          value={mail.mail_from_email}
          onChange={(e) => setMailField('mail_from_email', e.target.value)}
        />
        <TextInput label="IMAP host" value={mail.mail_imap_host} onChange={(e) => setMailField('mail_imap_host', e.target.value)} />
        <TextInput
          label="IMAP port"
          hint="993 when SSL is on. 143 for a plain connection."
          value={mail.mail_imap_port}
          onChange={(e) => setMailField('mail_imap_port', e.target.value)}
        />
        <ToggleSwitch
          helpKey="admin.settings.imap_secure"
          label="IMAP SSL"
          checked={mail.mail_imap_secure}
          onChange={(next) => setMailField('mail_imap_secure', next)}
        />
        <TextInput label="IMAP username" value={mail.mail_imap_user} onChange={(e) => setMailField('mail_imap_user', e.target.value)} autoComplete="off" />
        <TextInput
          label="IMAP password"
          helpKey="admin.settings.imap_password"
          type="password"
          autoComplete="new-password"
          hint={passwordHint(mail.mail_imap_password_set, mail.mail_imap_password_hint)}
          value={mail.mail_imap_password}
          onChange={(e) => setMailField('mail_imap_password', e.target.value)}
        />
        <Button helpKey="admin.settings.save" type="submit">
          Save settings
        </Button>
      </form>
    </div>
  );
}
