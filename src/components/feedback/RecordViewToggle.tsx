'use client';

import { LayoutGrid, List } from 'lucide-react';

export default function RecordViewToggle({ value, onChange }: { value: 'list' | 'tile'; onChange: (value: 'list' | 'tile') => void }) {
  const options = [
    { value: 'list' as const, label: 'List', Icon: List },
    { value: 'tile' as const, label: 'Tile', Icon: LayoutGrid },
  ];

  return (
    <div role="group" aria-label="Record display style" className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
      {options.map(({ value: option, label, Icon }) => (
        <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${value === option ? 'bg-blue-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
          <Icon className="h-4 w-4" />{label}
        </button>
      ))}
    </div>
  );
}
