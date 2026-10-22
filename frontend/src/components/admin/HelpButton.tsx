'use client';

import React, { ButtonHTMLAttributes, useEffect, useState } from 'react';
import Link from 'next/link';

type TipMap = Record<string, string>;

let tipCache: TipMap | null = null;
let tipPromise: Promise<TipMap> | null = null;

async function loadTips(): Promise<TipMap> {
  if (tipCache) return tipCache;
  if (!tipPromise) {
    tipPromise = fetch('/api/help-tips')
      .then(async (res) => {
        if (!res.ok) return {};
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        const map: TipMap = {};
        for (const row of rows) {
          if (row?.helpKey) map[row.helpKey] = row.body || row.title || '';
        }
        return map;
      })
      .catch(() => ({}));
  }
  tipCache = await tipPromise;
  return tipCache;
}

function useHelpTip(helpKey: string, fallback?: string) {
  const [tip, setTip] = useState('');
  useEffect(() => {
    let cancelled = false;
    loadTips().then((map) => {
      if (cancelled) return;
      setTip(map[helpKey] || fallback || '');
    });
    return () => {
      cancelled = true;
    };
  }, [helpKey, fallback]);
  return tip;
}

type HelpButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { helpKey: string };

export default function HelpButton({ helpKey, title, children, ...props }: HelpButtonProps) {
  const tip = useHelpTip(helpKey, typeof title === 'string' ? title : undefined);
  return (
    <button data-help-key={helpKey} title={tip || title || undefined} type="button" {...props}>
      {children}
    </button>
  );
}

export function HelpLink({
  helpKey,
  href,
  className,
  children,
  title,
  target,
  rel,
  ariaLabel,
}: {
  helpKey: string;
  href: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
  target?: string;
  rel?: string;
  ariaLabel?: string;
}) {
  const tip = useHelpTip(helpKey, title);
  const nativeAnchor = Boolean(target) || href.startsWith('mailto:') || href.startsWith('tel:');
  if (nativeAnchor) {
    return (
      <a href={href} target={target} rel={rel} data-help-key={helpKey} title={tip || title || undefined} aria-label={ariaLabel} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} data-help-key={helpKey} title={tip || title || undefined} aria-label={ariaLabel} className={className}>
      {children}
    </Link>
  );
}
