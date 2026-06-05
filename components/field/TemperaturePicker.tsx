'use client';
import { Flame, Sun, Minus, Wind, Snowflake } from 'lucide-react';
import type { Temperature } from '@/lib/types';

interface TemperaturePickerProps {
  value: Temperature;
  onChange: (t: Temperature) => void;
}

const OPTIONS: {
  value: Temperature;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  activeBg: string;
  activeText: string;
  activeBorder: string;
}[] = [
  { value: 'hot',      Icon: Flame,     label: 'Hot',      activeBg: 'bg-red-500',    activeText: 'text-white',     activeBorder: 'border-red-500' },
  { value: 'warm',     Icon: Sun,       label: 'Warm',     activeBg: 'bg-orange-500', activeText: 'text-white',     activeBorder: 'border-orange-500' },
  { value: 'lukewarm', Icon: Minus,     label: 'Lukewarm', activeBg: 'bg-amber-400',  activeText: 'text-[#07090F]', activeBorder: 'border-amber-400' },
  { value: 'cool',     Icon: Wind,      label: 'Cool',     activeBg: 'bg-sky-500',    activeText: 'text-white',     activeBorder: 'border-sky-500' },
  { value: 'cold',     Icon: Snowflake, label: 'Cold',     activeBg: 'bg-indigo-500', activeText: 'text-white',     activeBorder: 'border-indigo-500' },
];

export function TemperaturePicker({ value, onChange }: TemperaturePickerProps) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map(({ value: v, Icon, label, activeBg, activeText, activeBorder }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          title={label}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${
            value === v
              ? `${activeBg} ${activeText} ${activeBorder}`
              : 'border-white/7 text-text3 hover:border-white/12 bg-elevated'
          }`}
        >
          <Icon size={15} strokeWidth={2} />
          <span className="text-[11px] font-semibold">{label}</span>
        </button>
      ))}
    </div>
  );
}

const CHIP_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  hot:      Flame,
  warm:     Sun,
  lukewarm: Minus,
  cool:     Wind,
  cold:     Snowflake,
};

const CHIP_STYLE: Record<string, { wrapper: string; text: string }> = {
  hot:      { wrapper: 'bg-red-500/10 border border-red-500/20',       text: 'text-red-400' },
  warm:     { wrapper: 'bg-orange-500/10 border border-orange-500/20', text: 'text-orange-400' },
  lukewarm: { wrapper: 'bg-amber-400/10 border border-amber-400/20',   text: 'text-amber-400' },
  cool:     { wrapper: 'bg-sky-500/10 border border-sky-500/20',       text: 'text-sky-400' },
  cold:     { wrapper: 'bg-indigo-500/10 border border-indigo-500/20', text: 'text-indigo-400' },
};

const LABEL: Record<string, string> = {
  hot: 'Hot', warm: 'Warm', lukewarm: 'Lukewarm', cool: 'Cool', cold: 'Cold',
};

export function TemperatureChip({ value }: { value: Temperature | null }) {
  if (!value) return null;
  const style = CHIP_STYLE[value];
  const Icon = CHIP_ICON[value];
  if (!style || !Icon) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${style.wrapper} ${style.text}`}
    >
      <Icon size={11} strokeWidth={2} />
      {LABEL[value]}
    </span>
  );
}
