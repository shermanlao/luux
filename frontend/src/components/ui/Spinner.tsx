export default function Spinner({ className = '' }: { className?: string }) {
  return <div className={`spinner ${className}`.trim()} role="status" aria-label="Loading" />;
}
