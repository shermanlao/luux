'use client';

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { useHelpTip } from '@/components/admin/HelpButton';

type Common = { label: string; hint?: ReactNode; className?: string; helpKey?: string };

export function FormField({ label, hint, children, className = '' }: Common & { children: ReactNode }) {
  return (
    <div className={className}>
      <label className="admin-field-label">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-sm text-gray-500">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ label, hint, className = '', helpKey, title, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const tip = useHelpTip(helpKey || 'admin.product.save');
  return (
    <FormField label={label} hint={hint} className={className}>
      <input className="input-field" data-help-key={helpKey || undefined} title={helpKey ? tip || title : title} {...props} />
    </FormField>
  );
}

export function SelectField({
  label,
  hint,
  className = '',
  children,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FormField label={label} hint={hint} className={className}>
      <select className="select-field" {...props}>
        {children}
      </select>
    </FormField>
  );
}

export function TextareaField({
  label,
  hint,
  className = '',
  helpKey,
  title,
  ...props
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const tip = useHelpTip(helpKey || 'admin.product.save');
  return (
    <FormField label={label} hint={hint} className={className}>
      <textarea className="input-field" data-help-key={helpKey || undefined} title={helpKey ? tip || title : title} {...props} />
    </FormField>
  );
}
