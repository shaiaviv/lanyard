import Link from 'next/link';
import { Clock, Star } from 'lucide-react';
import { TemperatureChip } from '@/components/field/TemperaturePicker';
import type { Encounter, Contact } from '@/lib/types';

interface LeadCardProps {
  encounter: Encounter;
  contact: Contact | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function LeadCard({ encounter, contact }: LeadCardProps) {
  const name = contact?.canonicalName ?? encounter.identitySnapshot?.name ?? 'Unknown';
  const company = contact?.currentCompany ?? encounter.identitySnapshot?.company;
  const title = contact?.currentTitle ?? encounter.identitySnapshot?.title;
  const isPending = encounter.state === 'pending';

  const cardContent = (
    <div className={`bg-white rounded-2xl border p-4 space-y-3 ${isPending ? 'border-amber-200' : 'border-zinc-200'}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-zinc-900 truncate">{name}</p>
            {isPending && (
              <span className="flex-shrink-0 text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                needs review
              </span>
            )}
          </div>
          {(title || company) && (
            <p className="text-sm text-zinc-500 truncate">
              {[title, company].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <TemperatureChip value={encounter.temperature} />
      </div>

      {/* Note preview */}
      {encounter.note && (
        <p className="text-sm text-zinc-600 line-clamp-2">{encounter.note}</p>
      )}

      {/* Topics */}
      {encounter.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {encounter.topics.slice(0, 4).map((t) => (
            <span key={t} className="text-[11px] bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <Clock size={11} />
          {timeAgo(encounter.occurredAt)}
        </span>
        {encounter.followUp && (
          <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
            <Star size={11} fill="currentColor" />
            Follow up
          </span>
        )}
      </div>
    </div>
  );

  // Link to contact card if a contact is resolved
  if (contact?.id) {
    return <Link href={`/contact/${contact.id}`}>{cardContent}</Link>;
  }
  return cardContent;
}
