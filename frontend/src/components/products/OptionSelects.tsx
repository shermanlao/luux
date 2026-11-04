import type { ProductOption } from '@/lib/types';

export default function OptionSelects({
  options,
  selected,
  onChange,
}: {
  options: ProductOption[];
  selected: string[];
  onChange: (index: number, value: string) => void;
}) {
  if (!options.length) return null;
  return (
    <div className="space-y-4">
      {options.map((option, index) => (
        <label key={option.id} className="block">
          <span className="mb-1.5 block text-sm font-medium">{option.name}</span>
          <select
            className="select-field"
            value={selected[index] || ''}
            aria-label={option.name}
            onChange={(event) => onChange(index, event.target.value)}
          >
            {option.values.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
