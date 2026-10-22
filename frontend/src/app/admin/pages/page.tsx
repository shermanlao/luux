'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { TextInput, TextareaField } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { Page } from '@/lib/types';

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);

  useEffect(() => {
    fetch('/api/admin/pages')
      .then((res) => res.json())
      .then((data) => setPages(data.pages || []));
  }, []);

  async function save(page: Page) {
    const response = await fetch(`/api/admin/pages/${page.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: page.title, body_html: page.body_html }),
    });
    if (!response.ok) {
      showSaveNotice('Could not save page', 'error');
      return;
    }
    showSaveNotice('Page saved');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminPageHeader title="Pages" />
      <AdminNav />
      <div className="space-y-6">
        {pages.map((page, index) => (
          <Card key={page.id}>
            <p className="mb-2 text-xs uppercase tracking-widest text-gray-500">{page.handle}</p>
            <TextInput
              label="Title"
              value={page.title}
              onChange={(e) => setPages((current) => current.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)))}
            />
            <TextareaField
              className="mt-3"
              label="Body HTML"
              rows={8}
              value={page.body_html}
              onChange={(e) =>
                setPages((current) => current.map((row, i) => (i === index ? { ...row, body_html: e.target.value } : row)))
              }
            />
            <div className="mt-4">
              <Button helpKey="admin.page.save" onClick={() => save(page)}>
                Save page
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
