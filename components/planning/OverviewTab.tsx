'use client';
import { Flame, MapPinned, CalendarClock, Send, ArrowRight, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Conference } from '@/lib/types';
import type { CoverageRow, RelationshipRow, FollowUpRow, GapAnalysis } from '@/lib/db/queries';

// C1 — "Here's what needs your attention." Aggregates the rest of the hub into one glance.
export function OverviewTab({
  conferences,
  coverage,
  relationships,
  followUps,
  gap,
  onNavigate,
}: {
  conferences: Conference[];
  coverage: CoverageRow[];
  relationships: RelationshipRow[];
  followUps: FollowUpRow[];
  gap: GapAnalysis;
  onNavigate: (tab: 'Conferences' | 'Coverage' | 'Relationships' | 'Follow-ups') => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  const warmingNoFollowUp = relationships.filter(
    (r) => (r.verdict === 'warming' || r.verdict === 'nurturing') && !r.hasFollowUp,
  );
  const committed = new Set(coverage.filter((c) => c.status === 'committed').map((c) => c.conferenceId));
  const upcoming = conferences
    .filter((c) => !c.endDate || c.endDate >= today)
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text2">Here&apos;s what needs your attention.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Warming, no follow-up — the highest-leverage action */}
        <button
          onClick={() => onNavigate('Relationships')}
          className="text-left rounded-2xl border border-green-500/15 bg-green-500/[0.05] p-4 hover:border-green-500/30 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-green-400">
              <Flame size={15} /> Warming, no follow-up
            </span>
            <span className="text-xl font-bold text-green-400 tabular-nums">{warmingNoFollowUp.length}</span>
          </div>
          {warmingNoFollowUp.slice(0, 3).map((r) => (
            <p key={r.contactId} className="text-xs text-text2 truncate">
              {r.name} <span className="text-text3">· {r.company ?? ''}</span>
            </p>
          ))}
          {warmingNoFollowUp.length === 0 && <p className="text-xs text-text3">All warming relationships have a follow-up. Nice.</p>}
          <span className="flex items-center gap-1 text-xs text-green-400/70 mt-2">View relationships <ArrowRight size={11} /></span>
        </button>

        {/* Coverage gaps */}
        <button
          onClick={() => onNavigate('Coverage')}
          className="text-left rounded-2xl border border-warn/15 bg-warn/[0.05] p-4 hover:border-warn/30 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-warn">
              <AlertTriangle size={15} /> Under-invested
            </span>
            <span className="text-xl font-bold text-warn tabular-nums">{gap.uncovered.length}</span>
          </div>
          {gap.uncovered.slice(0, 3).map((c) => (
            <p key={c.id} className="text-xs text-text2 truncate">
              <span className="text-text3">{c.tier}</span> {c.name}
            </p>
          ))}
          {gap.uncovered.length === 0 && <p className="text-xs text-text3">Every priority event has a committed rep.</p>}
          <span className="flex items-center gap-1 text-xs text-warn/70 mt-2">View coverage <ArrowRight size={11} /></span>
        </button>

        {/* Next up */}
        <button
          onClick={() => onNavigate('Conferences')}
          className="text-left rounded-2xl border border-white/8 bg-card p-4 hover:border-white/14 transition-all"
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-text1 mb-2">
            <CalendarClock size={15} className="text-accent" /> Next up
          </span>
          <div className="space-y-1.5">
            {upcoming.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-text2 truncate">{c.name}</span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  {c.tier && <Badge variant={c.tier as 'T1' | 'T2' | 'T3'}>{c.tier}</Badge>}
                  {committed.has(c.id)
                    ? <span className="text-[10px] text-success">covered</span>
                    : <span className="text-[10px] text-warn">open</span>}
                </span>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-xs text-text3">No upcoming conferences.</p>}
          </div>
        </button>

        {/* Follow-up queue */}
        <button
          onClick={() => onNavigate('Follow-ups')}
          className="text-left rounded-2xl border border-white/8 bg-card p-4 hover:border-white/14 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-text1">
              <Send size={15} className="text-accent" /> Follow-up queue
            </span>
            <span className="text-xl font-bold text-text1 tabular-nums">{followUps.length}</span>
          </div>
          {followUps.slice(0, 3).map((f) => (
            <p key={f.encounterId} className="text-xs text-text2 truncate">
              {f.contactName} <span className="text-text3">· {f.repName}</span>
            </p>
          ))}
          {followUps.length === 0 && <p className="text-xs text-text3">No follow-ups flagged.</p>}
          <span className="flex items-center gap-1 text-xs text-text3 mt-2">Work the queue <ArrowRight size={11} /></span>
        </button>
      </div>

      {/* Region coverage mini-bars */}
      <div className="rounded-2xl border border-white/8 bg-card p-4">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-text1 mb-3">
          <MapPinned size={15} className="text-accent" /> Coverage by region
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {gap.byRegion.map((r) => {
            const pct = r.total > 0 ? Math.round((r.covered / r.total) * 100) : 0;
            return (
              <div key={r.region} className="flex items-center gap-2">
                <span className="text-xs text-text2 w-20 truncate">{r.region}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/6 overflow-hidden">
                  <div className={`h-full rounded-full ${pct === 0 ? 'bg-warn' : pct < 50 ? 'bg-amber-400' : 'bg-success'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-text3 tabular-nums w-9 text-right">{r.covered}/{r.total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
