'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { TextInput, TextareaField } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import type { Collection } from '@/lib/types';

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    fetch('/api/admin/collections')
      .then((res) => res.json())
      .then((data) => setCollections(data.collections || []));
  }, []);

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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminPageHeader title="Collections" />
      <AdminNav />
      <div className="space-y-6">
        {collections.map((collection, index) => (
          <Card key={collection.id}>
            <TextInput
              label="Title"
              value={collection.title}
              onChange={(e) =>
                setCollections((current) => current.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)))
              }
            />
            <TextInput
              className="mt-3"
              label="Handle"
              value={collection.handle}
              onChange={(e) =>
                setCollections((current) => current.map((row, i) => (i === index ? { ...row, handle: e.target.value } : row)))
              }
            />
            <TextareaField
              className="mt-3"
              label="Description"
              rows={4}
              value={collection.description}
              onChange={(e) =>
                setCollections((current) => current.map((row, i) => (i === index ? { ...row, description: e.target.value } : row)))
              }
            />
            <div className="mt-4">
              <Button helpKey="admin.collection.save" onClick={() => save(collection)}>
                Save collection
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
