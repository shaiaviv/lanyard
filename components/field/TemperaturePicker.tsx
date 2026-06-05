'use client';
import type { Temperature } from '@/lib/types';

interface TemperaturePickerProps {
  value: Temperature;
  onChange: (t: Temperature) => void;
}

const OPTIONS: { value: Temperature; emoji: string; label: string; activeClass: string }[] = [
  { value: 'hot',      emoji: '🔥', label: 'Hot',      activeClass: 'bg-red-500 text-white border-red-500' },
  { value: 'warm',     emoji: '☀️', label: 'Warm',     activeClass: 'bg-orange-400 text-white border-orange-400' },
  { value: 'lukewarm', emoji: '😐', label: 'Lukewarm', activeClass: 'bg-amber-300 text-zinc-800 border-amber-300' },
  { value: 'cool',     emoji: '❄️', label: 'Cool',     activeClass: 'bg-sky-400 text-white border-sky-400' },
  { value: 'cold',     emoji: '🥶', label: 'Cold',     activeClass: 'bg-blue-500 text-white border-blue-500' },
];

export function TemperaturePicker({ value, onChange }: TemperaturePickerProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={opt.label}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
            value === opt.value
              ? opt.activeClass
              : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 bg-white'
          }`}
        >
          <span className="text-base leading-none">{opt.emoji}</span>
          <span className="text-[10px]">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export function TemperatureChip({ value }: { value: Temperature | null }) {
  if (!value) return null;
  const opt = OPTIONS.find((o) => o.value === value);
  if (!opt) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${opt.activeClass}`}>
      {opt.emoji} {opt.label}
    </span>
  );
}
