'use client';

import { ButtonHTMLAttributes } from 'react';
import HelpButton, { HelpLink } from '@/components/admin/HelpButton';

const VARIANT_CLASS: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  accent: 'btn-accent',
  ghost: 'text-gray-800 hover:underline',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  helpKey: string;
  variant?: keyof typeof VARIANT_CLASS;
  href?: string;
  target?: string;
  rel?: string;
};

export default function Button({
  helpKey,
  variant = 'primary',
  href,
  target,
  rel,
  className = '',
  type,
  children,
  'aria-label': ariaLabel,
  ...props
}: ButtonProps) {
  const classes = `${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} ${className}`.trim();
  if (href) {
    return (
      <HelpLink helpKey={helpKey} href={href} className={classes} target={target} rel={rel} ariaLabel={ariaLabel}>
        {children}
      </HelpLink>
    );
  }
  return (
    <HelpButton helpKey={helpKey} className={classes} type={type || 'button'} aria-label={ariaLabel} {...props}>
      {children}
    </HelpButton>
  );
}
