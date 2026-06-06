'use client';
import { useState } from 'react';
import { MapPin, Users } from 'lucide-react';
import type { Conference } from '@/lib/types';
import type { CoverageRow } from '@/lib/db/queries';
import { Legend } from '@/components/planning/Legend';

interface Props {
  conferences: Conference[];
  coverage: CoverageRow[];
}

type Tier = 'T1' | 'T2' | 'T3';

// Coverage card colors — three clearly distinct hues, no overlap with each other
const COVERAGE_STYLE: Record<'committed' | 'considering' | 'uncovered', { bg: string; border: string; dashed?: boolean }> = {
  committed:  { bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.22)' },         // green
  considering:{ bg: 'rgba(96,165,250,0.05)',  border: 'rgba(96,165,250,0.28)', dashed: true }, // blue
  uncovered:  { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.18)' },         // grey
};

// Legend — Coverage only. Tiers are shown as plain text labels on each card, no color.
const TIMELINE_LEGEND = [
  {
    title: 'Coverage',
    items: [
      {
        swatch: <span className="w-4 h-3 rounded inline-block flex-shrink-0" style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.45)' }} />,
        label: 'Committed', labelClass: 'text-success',
      },
      {
        swatch: <span className="w-4 h-3 rounded inline-block flex-shrink-0" style={{ background: 'rgba(96,165,250,0.08)', border: '1.5px dashed rgba(96,165,250,0.5)' }} />,
        label: 'Considering', labelClass: 'text-blue-400',
      },
      {
        swatch: <span className="w-4 h-3 rounded inline-block flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.25)' }} />,
        label: 'Uncovered', labelClass: 'text-text2',
      },
    ],
  },
];

function monthKey(date: string) { return date.slice(0, 7); }

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function CoverageTimeline({ conferences, coverage }: Props) {
  const today = new Date().toISOString().split('T')[0];
  // Which uncovered tiers to fold into the calendar. Default: none — the calendar shows only the
  // events the team is already engaging (committed/considering), keeping it short. Reps opt into
  // the uncovered backlog one tier at a time, instead of scrolling all ~190 events.
  const [uncoveredTiers, setUncoveredTiers] = useState<Set<Tier>>(new Set());

  const upcoming = conferences.filter((c) => !c.endDate || c.endDate >= today.slice(0, 7) + '-01');

  const committedConfIds = new Set(
    coverage.filter((c) => c.status === 'committed').map((c) => c.conferenceId),
  );
  const consideringConfIds = new Set(
    coverage.filter((c) => c.status === 'considering').map((c) => c.conferenceId),
  );
  // "Covered" = at least one rep is committed OR considering. Everything else is the uncovered
  // backlog, hidden by default and revealed per-tier via the toggles.
  const isCovered = (id: string) => committedConfIds.has(id) || consideringConfIds.has(id);

  // Counts for the include-uncovered toggles.
  const uncoveredCount = (t: Tier) =>
    upcoming.filter((c) => c.tier === t && !isCovered(c.id)).length;

  // Calendar contents: always covered events, plus uncovered events for any opted-in tier.
  const shown = upcoming.filter(
    (c) => isCovered(c.id) || (c.tier != null && uncoveredTiers.has(c.tier as Tier)),
  );

  const byMonth = new Map<string, Conference[]>();
  for (const conf of shown) {
    const key = conf.startDate ? monthKey(conf.startDate) : 'unknown';
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(conf);
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

  const anyUncoveredShown = uncoveredTiers.size > 0;

  return (
    <div className="space-y-6">
      {/* Full calendar */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold text-text1">Full conference calendar</p>
            {/* Include-uncovered toggles — default off so the list shows only covered events */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-text3">Include uncovered:</span>
              {(['T1', 'T2', 'T3'] as const).map((t) => {
                const on = uncoveredTiers.has(t);
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setUncoveredTiers((prev) => {
                        const next = new Set(prev);
                        if (on) next.delete(t); else next.add(t);
                        return next;
                      })
                    }
                    aria-pressed={on}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      on
                        ? 'bg-accent/15 border-accent/30 text-accent'
                        : 'text-text3 bg-white/3 border-white/8 hover:text-text2 hover:border-white/14'
                    }`}
                  >
                    {t} · {uncoveredCount(t)}
                  </button>
                );
              })}
            </div>
          </div>
          <Legend groups={TIMELINE_LEGEND} />
        </div>

        <div className="space-y-8 pt-1">
          {months.map(([month, confs]) => (
            <div key={month}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xs font-semibold text-text3">{monthLabel(month)}</h3>
                <div className="flex-1 h-px bg-white/6" />
              </div>
              <div className="space-y-2">
                {confs.map((conf) => {
                  const covered = committedConfIds.has(conf.id);
                  const considering = !covered && consideringConfIds.has(conf.id);

                  const allCommitted = coverage.filter(
                    (c) => c.conferenceId === conf.id && c.status === 'committed',
                  );
                  const allConsidering = coverage.filter(
                    (c) => c.conferenceId === conf.id && c.status === 'considering',
                  );

                  const start = conf.startDate
                    ? new Date(conf.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    : null;

                  // shown ⊆ {covered, considering, opted-in uncovered}, so the else is always uncovered.
                  const coverageStyle = covered
                    ? COVERAGE_STYLE.committed
                    : considering
                    ? COVERAGE_STYLE.considering
                    : COVERAGE_STYLE.uncovered;

                  const borderStyle = coverageStyle.dashed
                    ? `1px dashed ${coverageStyle.border}`
                    : `1px solid ${coverageStyle.border}`;

                  return (
                    <div
                      key={conf.id}
                      className="rounded-xl p-3.5 space-y-2"
                      style={{ background: coverageStyle.bg, border: borderStyle }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text1 truncate">{conf.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-text3">
                            {conf.tier && <span>{conf.tier}</span>}
                            {start && <span>{start}</span>}
                            {conf.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={10} /> {conf.location}
                              </span>
                            )}
                            {conf.estAudience && (
                              <span className="flex items-center gap-1">
                                <Users size={10} /> {conf.estAudience.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {conf.icpScore != null && (
                          <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${conf.icpScore >= 70 ? 'text-accent' : 'text-text3'}`}>
                            {conf.icpScore}
                          </span>
                        )}
                      </div>

                      {(allCommitted.length > 0 || allConsidering.length > 0) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {allCommitted.map((c) => (
                            <span
                              key={c.id}
                              className="text-xs text-success font-medium px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
                            >
                              {c.repName}
                            </span>
                          ))}
                          {allConsidering.map((c) => (
                            <span
                              key={c.id}
                              className="text-xs text-blue-400 font-medium px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(96,165,250,0.08)', border: '1px dashed rgba(96,165,250,0.35)' }}
                            >
                              {c.repName}?
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {months.length === 0 && (
            <div className="text-center py-16 text-sm text-text3">
              {anyUncoveredShown
                ? 'No conferences match. Try including more uncovered tiers above.'
                : 'No covered conferences yet. Use “Include uncovered” above to show events the team hasn’t picked up.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
