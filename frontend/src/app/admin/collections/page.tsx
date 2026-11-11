'use client';

import { Fragment, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';
import Button from '@/components/ui/Button';
import HtmlField from '@/components/ui/HtmlField';
import { TextInput } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { Collection } from '@/lib/types';

function plainText(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/collections')
      .then((res) => res.json())
      .then((data) => setCollections(data.collections || []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: number) {
    setOpenId((current) => (current === id ? null : id));
  }

  async function save(collection: Collection) {
    const response = await fetch(`/api/admin/collections/${collection.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collection),
    });
    if (!response.ok) {
      showSaveNotice('Could not save collection', 'error');
      return;
    }
    showSaveNotice('Collection saved');
  }

  return (
    <div className="w-full px-6 py-10">
      <AdminPageHeader title="Collections" />
      <AdminTable
        columns={['Title', 'Handle', 'Products', 'Description', '']}
        loading={loading}
        empty={!collections.length}
      >
        {collections.map((collection, index) => {
          const open = openId === collection.id;
          const summary = plainText(collection.description);
          return (
            <Fragment key={collection.id}>
              <tr className="cursor-pointer hover:bg-gray-50" onClick={() => toggle(collection.id)}>
                <td className="px-6 py-3">{collection.title}</td>
                <td className="px-6 py-3">{collection.handle}</td>
                <td className="px-6 py-3">{collection.products_count}</td>
                <td className="max-w-md px-6 py-3 text-gray-600">
                  <span className="line-clamp-2">{summary || '—'}</span>
                </td>
                <td className="px-6 py-3 text-right">
                  <Button
                    helpKey="admin.collection.edit"
                    variant="secondary"
                    aria-expanded={open}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle(collection.id);
                    }}
                  >
                    {open ? 'Close' : 'Edit'}
                  </Button>
                </td>
              </tr>
              {open ? (
                <tr>
                  <td colSpan={5} className="bg-gray-50 px-6 py-5">
                    <TextInput
                      label="Title"
                      value={collection.title}
                      onChange={(e) =>
                        setCollections((current) =>
                          current.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)),
                        )
                      }
                    />
                    <TextInput
                      className="mt-3"
                      label="Handle"
                      value={collection.handle}
                      onChange={(e) =>
                        setCollections((current) =>
                          current.map((row, i) => (i === index ? { ...row, handle: e.target.value } : row)),
                        )
                      }
                    />
                    <HtmlField
                      className="mt-3"
                      label="Description"
                      rows={4}
                      value={collection.description}
                      onChange={(value) =>
                        setCollections((current) =>
                          current.map((row, i) => (i === index ? { ...row, description: value } : row)),
                        )
                      }
                    />
                    <div className="mt-4">
                      <Button helpKey="admin.collection.save" onClick={() => save(collection)}>
                        Save collection
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
