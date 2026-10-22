import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

type Common = { label: string; hint?: ReactNode; className?: string };

export function FormField({ label, hint, children, className = '' }: Common & { children: ReactNode }) {
  return (
    <div className={className}>
      <label className="admin-field-label">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-sm text-gray-500">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ label, hint, className = '', ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FormField label={label} hint={hint} className={className}>
      <input className="input-field" {...props} />
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
  ...props
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FormField label={label} hint={hint} className={className}>
      <textarea className="input-field" {...props} />
    </FormField>
  );
}
