'use client';

import { FormEvent, useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import { TextInput, TextareaField } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { SiteSettings } from '@/lib/types';

export default function AdminSettingsPage() {
  const [site, setSite] = useState<SiteSettings | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => setSite(data.site));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!site) return;
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site),
    });
    if (!response.ok) {
      showSaveNotice('Could not save settings', 'error');
      return;
    }
    showSaveNotice('Settings saved');
  }

  if (!site) return null;

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSite((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminPageHeader title="Settings" />
      <AdminNav />
      <form onSubmit={save} className="space-y-4">
        <TextInput label="Company" value={site.company_name} onChange={(e) => set('company_name', e.target.value)} />
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
        <TextareaField label="Story" rows={4} value={site.story_body} onChange={(e) => set('story_body', e.target.value)} />
        <TextInput label="Shop heading" value={site.shop_heading} onChange={(e) => set('shop_heading', e.target.value)} />
        <TextareaField label="Shop body" rows={4} value={site.shop_body} onChange={(e) => set('shop_body', e.target.value)} />
        <TextareaField label="Sanctuary heading" rows={3} value={site.sanctuary_heading} onChange={(e) => set('sanctuary_heading', e.target.value)} />
        <TextInput label="Email" value={site.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
        <TextInput label="Phone" value={site.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
        <TextInput label="Address" value={site.contact_address} onChange={(e) => set('contact_address', e.target.value)} />
        <TextInput label="Facebook" value={site.facebook_url} onChange={(e) => set('facebook_url', e.target.value)} />
        <TextInput label="Instagram" value={site.instagram_url} onChange={(e) => set('instagram_url', e.target.value)} />
        <TextInput label="SEO title" value={site.seo_title} onChange={(e) => set('seo_title', e.target.value)} />
        <TextareaField label="SEO description" rows={3} value={site.seo_description} onChange={(e) => set('seo_description', e.target.value)} />
        <Button helpKey="admin.settings.save" type="submit">
          Save settings
        </Button>
      </form>
    </div>
  );
}
