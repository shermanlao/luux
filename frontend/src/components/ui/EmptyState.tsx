import { ReactNode } from 'react';

export default function EmptyState({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`empty-state ${className}`.trim()}>{children}</div>;
}
