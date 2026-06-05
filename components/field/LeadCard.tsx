import Link from 'next/link';
import { Clock, Star } from 'lucide-react';
import { TemperatureChip } from '@/components/field/TemperaturePicker';
import type { Encounter, Contact } from '@/lib/types';

const TEMP_STRIPE: Record<string, string> = {
  hot:      'bg-red-500',
  warm:     'bg-orange-500',
  lukewarm: 'bg-amber-400',
  cool:     'bg-sky-400',
  cold:     'bg-indigo-400',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface LeadCardProps {
  encounter: Encounter;
  contact: Contact | null;
}

export function LeadCard({ encounter, contact }: LeadCardProps) {
  const name = contact?.canonicalName ?? encounter.identitySnapshot?.name ?? 'Unknown';
  const company = contact?.currentCompany ?? encounter.identitySnapshot?.company;
  const title = contact?.currentTitle ?? encounter.identitySnapshot?.title;
  const isPending = encounter.state === 'pending';
  const stripeColor = TEMP_STRIPE[encounter.temperature ?? ''] ?? 'bg-[rgba(255,255,255,0.1)]';

  const cardContent = (
    <div
      className={`bg-card rounded-2xl transition-all hover:translate-y-[-1px] ${
        isPending
          ? 'border border-[rgba(245,158,11,0.2)]'
          : 'border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.12)]'
      }`}
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
    >
      <div className="px-4 py-4 space-y-2.5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-text1 truncate">{name}</p>
              {isPending && (
                <span
                  className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    color: '#F59E0B',
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}
                >
                  Review
                </span>
              )}
            </div>
            {(title || company) && (
              <p className="text-sm text-text2 truncate mt-0.5">
                {[title, company].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <TemperatureChip value={encounter.temperature} />
        </div>

        {encounter.note && (
          <p className="text-sm text-text2 line-clamp-2 leading-relaxed">{encounter.note}</p>
        )}

        {encounter.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {encounter.topics.slice(0, 4).map((t) => (
              <span
                key={t}
                className="text-[10px] text-text2 rounded-full px-2 py-0.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-0.5">
          <span className="flex items-center gap-1.5 text-xs text-text3">
            <Clock size={11} />
            {timeAgo(encounter.occurredAt)}
          </span>
          {encounter.followUp && (
            <span className="flex items-center gap-1 text-xs text-accent font-semibold">
              <Star size={11} fill="currentColor" />
              Follow up
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (contact?.id) return <Link href={`/contact/${contact.id}`}>{cardContent}</Link>;
  return cardContent;
}
