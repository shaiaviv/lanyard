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
    if (e.target.value) params.set('conf', e.target.value);
    else params.delete('conf');
    router.replace(`?${params.toString()}`);
  }

  if (conferences.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-text3">
        <MapPin size={12} />
        <span>No conferences — run setup.sql</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <MapPin size={12} className={selected ? 'text-accent' : 'text-text3'} />
      <select
        value={selectedId ?? ''}
        onChange={handleChange}
        className="text-sm font-medium bg-transparent border-none outline-none text-text2 cursor-pointer"
        style={{ colorScheme: 'dark' }}
      >
        <option value="" style={{ background: '#161E2E' }}>
          — pick a conference —
        </option>
        {conferences.map((c) => (
          <option key={c.id} value={c.id} style={{ background: '#161E2E' }}>
            {c.name}
            {c.location ? ` · ${c.location}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
