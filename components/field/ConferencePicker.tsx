'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin } from 'lucide-react';
import type { Conference } from '@/lib/types';

interface ConferencePickerProps {
  conferences: Conference[];
  activeId: string | null;
}

export function ConferencePicker({ conferences, activeId }: ConferencePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get('conf') ?? activeId;
  const selected = conferences.find((c) => c.id === selectedId);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set('conf', e.target.value);
    } else {
      params.delete('conf');
    }
    router.replace(`?${params.toString()}`);
  }

  if (conferences.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-50 rounded-lg px-3 py-2">
        <MapPin size={14} />
        <span>No conferences seeded yet — run setup.sql</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <MapPin size={14} className={selected ? 'text-orange-500' : 'text-zinc-400'} />
      <select
        value={selectedId ?? ''}
        onChange={handleChange}
        className="flex-1 text-sm font-medium bg-transparent border-none outline-none text-zinc-800 cursor-pointer"
      >
        <option value="">— pick a conference —</option>
        {conferences.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{c.location ? ` · ${c.location}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
