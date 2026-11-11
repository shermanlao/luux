'use client';

import { Fragment, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';
import Button from '@/components/ui/Button';
import HtmlField from '@/components/ui/HtmlField';
import { TextInput } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { Page } from '@/lib/types';

function plainText(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/pages')
      .then((res) => res.json())
      .then((data) => setPages(data.pages || []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: number) {
    setOpenId((current) => (current === id ? null : id));
  }

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
    <div className="w-full px-6 py-10">
      <AdminPageHeader title="Pages" />
      <AdminTable columns={['Title', 'Handle', 'Body', '']} loading={loading} empty={!pages.length}>
        {pages.map((page, index) => {
          const open = openId === page.id;
          const summary = plainText(page.body_html);
          return (
            <Fragment key={page.id}>
              <tr className="cursor-pointer hover:bg-gray-50" onClick={() => toggle(page.id)}>
                <td className="px-6 py-3">{page.title}</td>
                <td className="px-6 py-3">{page.handle}</td>
                <td className="max-w-md px-6 py-3 text-gray-600">
                  <span className="line-clamp-2">{summary || '—'}</span>
                </td>
                <td className="px-6 py-3 text-right">
                  <Button
                    helpKey="admin.page.edit"
                    variant="secondary"
                    aria-expanded={open}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle(page.id);
                    }}
                  >
                    {open ? 'Close' : 'Edit'}
                  </Button>
                </td>
              </tr>
              {open ? (
                <tr>
                  <td colSpan={4} className="bg-gray-50 px-6 py-5">
                    <TextInput
                      label="Title"
                      value={page.title}
                      onChange={(e) =>
                        setPages((current) => current.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)))
                      }
                    />
                    <HtmlField
                      className="mt-3"
                      label="Body HTML"
                      rows={8}
                      value={page.body_html}
                      onChange={(value) =>
                        setPages((current) => current.map((row, i) => (i === index ? { ...row, body_html: value } : row)))
                      }
                    />
                    <div className="mt-4">
                      <Button helpKey="admin.page.save" onClick={() => save(page)}>
                        Save page
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </AdminTable>
    </div>
  );
}
