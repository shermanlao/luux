'use client';

import { FormEvent, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import { TextInput } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';

type Integrations = {
  ai_base_url: string;
  ai_model: string;
  ai_api_key_set: boolean;
  ai_api_key_hint: string;
  stripe_secret_key_set: boolean;
  stripe_secret_key_hint: string;
  stripe_publishable_key_set: boolean;
  stripe_publishable_key_hint: string;
  stripe_webhook_secret_set: boolean;
  stripe_webhook_secret_hint: string;
  marketing_api_key_set: boolean;
  marketing_api_key_hint: string;
  facebook_page_id: string;
  facebook_page_token_set: boolean;
  facebook_page_token_hint: string;
  instagram_account_id: string;
  instagram_token_set: boolean;
  instagram_token_hint: string;
  threads_user_id: string;
  threads_token_set: boolean;
  threads_token_hint: string;
  pinterest_board_id: string;
  pinterest_token_set: boolean;
  pinterest_token_hint: string;
};

type FormState = Integrations & {
  ai_api_key: string;
  stripe_secret_key: string;
  stripe_publishable_key: string;
  stripe_webhook_secret: string;
  facebook_page_token: string;
  instagram_token: string;
  threads_token: string;
  pinterest_token: string;
};

const EMPTY: FormState = {
  ai_base_url: '',
  ai_model: '',
  ai_api_key: '',
  ai_api_key_set: false,
  ai_api_key_hint: '',
  stripe_secret_key: '',
  stripe_secret_key_set: false,
  stripe_secret_key_hint: '',
  stripe_publishable_key: '',
  stripe_publishable_key_set: false,
  stripe_publishable_key_hint: '',
  stripe_webhook_secret: '',
  stripe_webhook_secret_set: false,
  stripe_webhook_secret_hint: '',
  marketing_api_key_set: false,
  marketing_api_key_hint: '',
  facebook_page_id: '',
  facebook_page_token: '',
  facebook_page_token_set: false,
  facebook_page_token_hint: '',
  instagram_account_id: '',
  instagram_token: '',
  instagram_token_set: false,
  instagram_token_hint: '',
  threads_user_id: '',
  threads_token: '',
  threads_token_set: false,
  threads_token_hint: '',
  pinterest_board_id: '',
  pinterest_token: '',
  pinterest_token_set: false,
  pinterest_token_hint: '',
};

function applySaved(integrations: Integrations): FormState {
  return {
    ...EMPTY,
    ...integrations,
    ai_api_key: '',
    stripe_secret_key: '',
    stripe_publishable_key: '',
    stripe_webhook_secret: '',
    facebook_page_token: '',
    instagram_token: '',
    threads_token: '',
    pinterest_token: '',
  };
}

function keyHint(set: boolean, hint: string): string {
  if (!set) return 'Not saved yet. Leave blank later to keep the current key.';
  return `Saved key ending ${hint}. Leave blank to keep it.`;
}

export default function AdminIntegrationsPage() {
  const [form, setForm] = useState<FormState | null>(null);
  const [freshKey, setFreshKey] = useState('');

  useEffect(() => {
    fetch('/api/admin/integrations')
      .then((res) => res.json())
      .then((data) => setForm(applySaved(data.integrations)))
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const response = await fetch('/api/admin/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ai_base_url: form.ai_base_url,
        ai_model: form.ai_model,
        ai_api_key: form.ai_api_key,
        stripe_secret_key: form.stripe_secret_key,
        stripe_publishable_key: form.stripe_publishable_key,
        stripe_webhook_secret: form.stripe_webhook_secret,
        facebook_page_id: form.facebook_page_id,
        facebook_page_token: form.facebook_page_token,
        instagram_account_id: form.instagram_account_id,
        instagram_token: form.instagram_token,
        threads_user_id: form.threads_user_id,
        threads_token: form.threads_token,
        pinterest_board_id: form.pinterest_board_id,
        pinterest_token: form.pinterest_token,
      }),
    });
    if (!response.ok) {
      showSaveNotice('Could not save integrations', 'error');
      return;
    }
    const data = await response.json();
    setForm(applySaved(data.integrations));
    showSaveNotice('Integrations saved');
  }

  async function generateKey() {
    const response = await fetch('/api/marketing/v1/keys', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showSaveNotice(data.error || 'Could not create a marketing key', 'error');
      return;
    }
    setFreshKey(String(data.marketing_api_key || ''));
    setForm((current) =>
      current
        ? {
            ...current,
            marketing_api_key_set: true,
            marketing_api_key_hint: `••••${String(data.marketing_api_key || '').slice(-4)}`,
          }
        : current
    );
  }

  if (!form) return null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminPageHeader title="Integrations" />
      <form onSubmit={save} className="space-y-4">
        <h2 className="pt-2 text-lg">AI API</h2>
        <p className="text-sm text-gray-600">Marketing uses this key to draft posts. A blank key keeps the saved value.</p>
        <TextInput label="Base URL" value={form.ai_base_url} onChange={(e) => set('ai_base_url', e.target.value)} />
        <TextInput
          label="API key"
          type="password"
          autoComplete="new-password"
          value={form.ai_api_key}
          hint={keyHint(form.ai_api_key_set, form.ai_api_key_hint)}
          onChange={(e) => set('ai_api_key', e.target.value)}
        />
        <TextInput
          label="Model"
          value={form.ai_model}
          hint="Leave blank for grok-4.7 on api.x.ai, or gpt-4o-mini on OpenAI. Set the provider’s model name for any other base URL."
          onChange={(e) => set('ai_model', e.target.value)}
        />
        <h2 className="pt-4 text-lg">Stripe</h2>
        <TextInput
          label="Secret key"
          type="password"
          autoComplete="new-password"
          value={form.stripe_secret_key}
          hint={keyHint(form.stripe_secret_key_set, form.stripe_secret_key_hint)}
          onChange={(e) => set('stripe_secret_key', e.target.value)}
        />
        <TextInput
          label="Publishable key"
          type="password"
          autoComplete="new-password"
          value={form.stripe_publishable_key}
          hint={keyHint(form.stripe_publishable_key_set, form.stripe_publishable_key_hint)}
          onChange={(e) => set('stripe_publishable_key', e.target.value)}
        />
        <TextInput
          label="Webhook secret"
          type="password"
          autoComplete="new-password"
          value={form.stripe_webhook_secret}
          hint={keyHint(form.stripe_webhook_secret_set, form.stripe_webhook_secret_hint)}
          onChange={(e) => set('stripe_webhook_secret', e.target.value)}
        />
        <h2 className="pt-4 text-lg">Social posting</h2>
        <p className="text-sm text-gray-600">
          Profile links on Settings stay public. These fields are the Page, Instagram, Threads, and Pinterest credentials used only after you confirm a post.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>
            Facebook: open Graph API Explorer, run GET me/accounts, and paste the numeric Page id plus that Page’s access_token. The token needs pages_manage_posts.
          </li>
          <li>
            Instagram: in the same Explorer, run GET /PAGE_ID?fields=instagram_business_account and paste instagram_business_account.id. The account must be a professional account linked to the Page. The token needs instagram_content_publish. The Page token often works.
          </li>
          <li>
            Threads: in your Meta app, open Access the Threads API and generate a token with threads_basic and threads_content_publish. Call GET graph.threads.net/v1.0/me?fields=id with that token and paste the id.
          </li>
          <li>
            Pinterest: on developers.pinterest.com, open your app and generate a token with boards:read and pins:write. Call GET api.pinterest.com/v5/boards and paste the board id. A Trial app’s pins stay visible only to you until Pinterest grants Standard access. Paste a new token when it expires.
          </li>
        </ul>
        <TextInput label="Facebook Page id" value={form.facebook_page_id} onChange={(e) => set('facebook_page_id', e.target.value)} />
        <TextInput
          label="Facebook Page token"
          type="password"
          autoComplete="new-password"
          value={form.facebook_page_token}
          hint={keyHint(form.facebook_page_token_set, form.facebook_page_token_hint)}
          onChange={(e) => set('facebook_page_token', e.target.value)}
        />
        <TextInput
          label="Instagram account id"
          value={form.instagram_account_id}
          onChange={(e) => set('instagram_account_id', e.target.value)}
        />
        <TextInput
          label="Instagram token"
          type="password"
          autoComplete="new-password"
          value={form.instagram_token}
          hint={keyHint(form.instagram_token_set, form.instagram_token_hint)}
          onChange={(e) => set('instagram_token', e.target.value)}
        />
        <TextInput label="Threads user id" value={form.threads_user_id} onChange={(e) => set('threads_user_id', e.target.value)} />
        <TextInput
          label="Threads token"
          type="password"
          autoComplete="new-password"
          value={form.threads_token}
          hint={keyHint(form.threads_token_set, form.threads_token_hint)}
          onChange={(e) => set('threads_token', e.target.value)}
        />
        <TextInput
          label="Pinterest board id"
          helpKey="admin.integrations.pinterest_board"
          value={form.pinterest_board_id}
          onChange={(e) => set('pinterest_board_id', e.target.value)}
        />
        <TextInput
          label="Pinterest token"
          helpKey="admin.integrations.pinterest_token"
          type="password"
          autoComplete="new-password"
          value={form.pinterest_token}
          hint={keyHint(form.pinterest_token_set, form.pinterest_token_hint)}
          onChange={(e) => set('pinterest_token', e.target.value)}
        />
        <h2 className="pt-4 text-lg">Marketing key</h2>
        <p className="text-sm text-gray-600">
          {form.marketing_api_key_set
            ? `A key is saved${form.marketing_api_key_hint ? `, ending ${form.marketing_api_key_hint}` : ''}. Generating a new one replaces it. Paste the new key into the marketer.`
            : 'No key yet. Generate one and paste it into the marketer. It can read traffic, draft posts, and publish. It cannot change products, orders, or these tokens.'}
        </p>
        {freshKey ? (
          <p className="break-all rounded border border-gray-200 bg-gray-50 p-3 text-sm">
            Copy this key now. It will not be shown again.
            <span className="mt-2 block font-mono">{freshKey}</span>
          </p>
        ) : null}
        <Button helpKey="admin.integrations.marketing_key" type="button" variant="secondary" onClick={generateKey}>
          Generate marketing key
        </Button>
        <div>
          <Button helpKey="admin.integrations.save" type="submit">
            Save integrations
          </Button>
        </div>
      </form>
    </div>
  );
}
