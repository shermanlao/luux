import { ReactNode } from 'react';

const VARIANT_CLASS = {
  error: 'alert-error',
  success: 'alert-success',
  warning: 'alert-warning',
} as const;

export default function AlertBanner({
  variant = 'error',
  children,
  className = '',
}: {
  variant?: keyof typeof VARIANT_CLASS;
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${VARIANT_CLASS[variant]} ${className}`.trim()}>{children}</div>;
}
