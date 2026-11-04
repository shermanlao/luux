'use client';

import { useState } from 'react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

export default function HtmlField({
  label,
  value,
  onChange,
  rows = 8,
  className = '',
  helpKey = 'admin.html.display',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
  helpKey?: string;
}) {
  const [showDisplay, setShowDisplay] = useState(false);
  return (
    <div className={className}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <span className="admin-field-label mb-0">{label}</span>
        <span className="inline-flex items-center gap-2 text-sm">
          <span className={showDisplay ? 'text-gray-400' : 'font-medium text-gray-900'}>Current</span>
          <ToggleSwitch helpKey={helpKey} checked={showDisplay} onChange={setShowDisplay} label="Display" />
        </span>
      </div>
      {showDisplay ? (
        <div
          className="prose-luux max-h-80 overflow-auto rounded-md border border-gray-300 bg-white px-3 py-2"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <textarea className="input-field" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}
