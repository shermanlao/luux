import { ReactNode, HTMLAttributes } from 'react';

export default function Card({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`card-panel ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
