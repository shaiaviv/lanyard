'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Building2, Clock, Flame, Briefcase, Star } from 'lucide-react';
import { TemperatureChip } from '@/components/field/TemperaturePicker';
import type { RelationshipRow } from '@/lib/db/queries';
import type { Temperature } from '@/lib/types';

const VERDICT_META: Record<
  string,
  { label: string; mark: string; text: string; bg: string; border: string }
> = {
  warming:    { label: 'Warming',     mark: '↑', text: 'text-green-400',  bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.22)' },
  nurturing:  { label: 'Nurturing',   mark: '◎', text: 'text-blue-400',   bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.22)' },
  cooling:    { label: 'Cooling',     mark: '↓', text: 'text-red-400',    bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)' },
  tirekicker: { label: 'Tire-kicker', mark: '—', text: 'text-amber-400',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)' },
  tooearly:   { label: 'Too early',   mark: '○', text: 'text-text2',      bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
};

type Filter = 'all' | 'warming' | 'no-followup' | 'at-risk' | 'tirekickers';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'warming',      label: 'Warming' },
  { key: 'no-followup',  label: 'Warming · no follow-up' },
  { key: 'at-risk',      label: 'At risk' },
  { key: 'tirekickers',  label: 'Tire-kickers' },
];

function matches(r: RelationshipRow, f: Filter): boolean {
  switch (f) {
    case 'warming':     return r.verdict === 'warming';
    case 'no-followup': return (r.verdict === 'warming' || r.verdict === 'nurturing') && !r.hasFollowUp;
    case 'at-risk':     return r.verdict === 'cooling';
    case 'tirekickers': return r.verdict === 'tirekicker';
    default:            return true;
  }
}

export function RelationshipList({ rows }: { rows: RelationshipRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = rows.filter((r) => matches(r, filter));

  const count = (f: Filter) => rows.filter((r) => matches(r, f)).length;
  const warmingNoFollowUp = count('no-followup');

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-elevated flex items-center justify-center border border-white/7">
          <Flame size={22} className="text-text3" />
        </div>
        <div>
          <h3 className="font-semibold text-text2">No cross-conference relationships yet</h3>
          <p className="text-sm text-text3 mt-1 max-w-xs leading-relaxed">
            When the team meets the same person at two or more events, the relationship arc shows up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Headline nudge — the killer signal */}
      {warmingNoFollowUp > 0 && (
        <div className="rounded-xl px-4 py-3 bg-green-500/[0.06] border border-green-500/15">
          <p className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
            <Star size={13} fill="currentColor" />
            {warmingNoFollowUp} warming relationship{warmingNoFollowUp !== 1 ? 's' : ''} with no follow-up
          </p>
          <p className="text-xs text-green-400/60 mt-0.5">
            Rising intent across events but nothing scheduled — the highest-leverage outreach right now.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f.key
                ? 'bg-accent text-[#07090F]'
                : 'text-text2 hover:text-text1 bg-white/4 border border-white/8'
            }`}
          >
            {f.label} <span className="opacity-60">· {count(f.key)}</span>
          </button>
        ))}
      </div>

      {/* Ranked list */}
      <div className="space-y-2.5">
        {shown.map((r) => {
          const vm = r.verdict ? VERDICT_META[r.verdict] : null;
          return (
            <Link
              key={r.contactId}
              href={`/contact/${r.contactId}`}
              className="block bg-card rounded-2xl border border-white/7 p-4 hover:border-white/14 hover:-translate-y-px transition-all"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.25)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text1 truncate">{r.name}</span>
                    {vm && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${vm.text}`}
                        style={{ background: vm.bg, border: `1px solid ${vm.border}` }}
                      >
                        {vm.mark} {vm.label}
                      </span>
                    )}
                    {r.jobChange && (
                      <span className="text-[11px] font-medium text-text3 px-2 py-0.5 rounded-full bg-white/4 border border-white/8 flex items-center gap-1">
                        <Briefcase size={10} /> job change
                      </span>
                    )}
                  </div>
                  {(r.title || r.company) && (
                    <p className="text-sm text-text2 truncate mt-0.5 flex items-center gap-1">
                      <Building2 size={12} className="text-text3 flex-shrink-0" />
                      {[r.title, r.company].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {r.latestTemperature && <TemperatureChip value={r.latestTemperature as Temperature} />}
                  <ArrowUpRight size={14} className="text-text3" />
                </div>
              </div>

              {/* Arc stats */}
              <div className="flex items-center gap-3 mt-3 text-xs text-text3 flex-wrap">
                <span className="text-text2 font-semibold tabular-nums">{r.meetings}</span> meetings
                <span className="text-text3/30">·</span>
                <span className="text-text2 font-semibold tabular-nums">{r.conferences}</span> events
                {r.spanMonths != null && (
                  <>
                    <span className="text-text3/30">·</span>
                    <span className="text-text2 font-semibold tabular-nums">{r.spanMonths}mo</span> span
                  </>
                )}
                <span className="text-text3/30">·</span>
                <span className="flex items-center gap-1">
                  <Clock size={10} /> last {new Date(r.lastSeen).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
                {r.hasFollowUp && (
                  <span className="flex items-center gap-1 text-accent font-medium">
                    <Star size={10} fill="currentColor" /> follow-up flagged
                  </span>
                )}
              </div>

              {/* Conference trail */}
              {r.conferenceTrail.length > 0 && (
                <p className="text-[11px] text-text3 mt-2 truncate">
                  {r.conferenceTrail.join('  →  ')}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {shown.length === 0 && (
        <div className="text-center py-12 text-sm text-text3">No relationships match this filter.</div>
      )}
    </div>
  );
}
