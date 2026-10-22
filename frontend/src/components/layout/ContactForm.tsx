'use client';

import { FormEvent, useState } from 'react';
import Button from '@/components/ui/Button';
import { TextInput, TextareaField } from '@/components/ui/FormField';
import { showSaveNotice } from '@/components/ui/SaveNotice';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    });
    setBusy(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showSaveNotice(data.error || 'Could not send', 'error');
      return;
    }
    setName('');
    setEmail('');
    setMessage('');
    showSaveNotice('Message sent.');
  }

  return (
    <form onSubmit={submit} className="mt-10 space-y-4">
      <TextInput label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
      <TextInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <TextareaField label="Message" rows={6} value={message} onChange={(event) => setMessage(event.target.value)} required />
      <Button helpKey="contact.send" type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Send'}
      </Button>
    </form>
  );
}
