'use client';

import HelpButton from '@/components/admin/HelpButton';

export default function ToggleSwitch({
  helpKey,
  checked,
  onChange,
  label,
  disabled,
}: {
  helpKey: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-700">
      <HelpButton
        helpKey={helpKey}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-black' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </HelpButton>
      <span>{label}</span>
    </span>
  );
}
