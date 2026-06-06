'use client';
import { useState } from 'react';
import { MapPin, Users } from 'lucide-react';
import type { Conference } from '@/lib/types';
import type { CoverageRow } from '@/lib/db/queries';
import { Legend } from '@/components/planning/Legend';

interface Props {
  conferences: Conference[];
  coverage: CoverageRow[];
  repFilter?: string;             // 'all' | repId
  isSuggestionMode?: boolean;
}

type Tier = 'T1' | 'T2' | 'T3';

const COVERAGE_STYLE: Record<'committed' | 'considering' | 'uncovered' | 'suggested', { bg: string; border: string; dashed?: boolean }> = {
  committed:  { bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.22)' },
  considering:{ bg: 'rgba(96,165,250,0.05)',  border: 'rgba(96,165,250,0.28)', dashed: true },
  suggested:  { bg: 'rgba(244,168,37,0.05)',  border: 'rgba(244,168,37,0.28)', dashed: true },
  uncovered:  { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.18)' },
};

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

const SUGGESTION_LEGEND = [
  {
    title: 'Coverage',
    items: [
      {
        swatch: <span className="w-4 h-3 rounded inline-block flex-shrink-0" style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.45)' }} />,
        label: 'Committed (locked)', labelClass: 'text-success',
      },
      {
        swatch: <span className="w-4 h-3 rounded inline-block flex-shrink-0" style={{ background: 'rgba(244,168,37,0.08)', border: '1.5px dashed rgba(244,168,37,0.5)' }} />,
        label: 'AI proposed', labelClass: 'text-accent',
      },
    ],
  },
];

function monthKey(date: string) { return date.slice(0, 7); }

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function CoverageTimeline({ conferences, coverage, repFilter = 'all', isSuggestionMode = false }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [uncoveredTiers, setUncoveredTiers] = useState<Set<Tier>>(new Set());

  const upcoming = conferences.filter((c) => !c.endDate || c.endDate >= today.slice(0, 7) + '-01');

  // When a rep is filtered, compute order numbers for that rep's assignments.
  const repOrderMap = new Map<string, number>(); // conferenceId → order
  if (repFilter !== 'all') {
    const repAssignments = coverage
      .filter((c) => c.repId === repFilter)
      .map((c) => ({ conferenceId: c.conferenceId, startDate: upcoming.find((u) => u.id === c.conferenceId)?.startDate ?? null }))
      .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
    repAssignments.forEach((a, i) => repOrderMap.set(a.conferenceId, i + 1));
  }

  const committedConfIds = new Set(
    coverage.filter((c) => c.status === 'committed').map((c) => c.conferenceId),
  );
  const consideringConfIds = new Set(
    coverage.filter((c) => c.status === 'considering').map((c) => c.conferenceId),
  );
  const suggestedConfIds = new Set(
    coverage.filter((c) => c.status === 'suggested').map((c) => c.conferenceId),
  );

  const isCovered = (id: string) =>
    committedConfIds.has(id) || consideringConfIds.has(id) || suggestedConfIds.has(id);

  const uncoveredCount = (t: Tier) =>
    upcoming.filter((c) => c.tier === t && !isCovered(c.id)).length;

  const shown = upcoming.filter((c) => {
    // Rep filter: if set, only show conferences assigned to that rep.
    if (repFilter !== 'all') {
      return coverage.some((cv) => cv.repId === repFilter && cv.conferenceId === c.id);
    }
    return isCovered(c.id) || (c.tier != null && uncoveredTiers.has(c.tier as Tier));
  });

  const byMonth = new Map<string, Conference[]>();
  for (const conf of shown) {
    const key = conf.startDate ? monthKey(conf.startDate) : 'unknown';
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(conf);
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

  const isRepFiltered = repFilter !== 'all';
  const totalStops = repOrderMap.size;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold text-text1">
              {isRepFiltered ? `${conferences.find(() => true) ? '' : ''}Travel itinerary` : 'Full conference calendar'}
            </p>
            {!isRepFiltered && !isSuggestionMode && (
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
            )}
          </div>
          <Legend groups={isSuggestionMode ? SUGGESTION_LEGEND : TIMELINE_LEGEND} />
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
                  const suggested = !covered && !considering && suggestedConfIds.has(conf.id);

                  const allCommitted = coverage.filter(
                    (c) => c.conferenceId === conf.id && c.status === 'committed' &&
                      (repFilter === 'all' || c.repId === repFilter),
                  );
                  const allConsidering = coverage.filter(
                    (c) => c.conferenceId === conf.id && c.status === 'considering' &&
                      (repFilter === 'all' || c.repId === repFilter),
                  );
                  const allSuggested = coverage.filter(
                    (c) => c.conferenceId === conf.id && c.status === 'suggested' &&
                      (repFilter === 'all' || c.repId === repFilter),
                  );

                  const fmtDate = (d: string) => {
                    const date = new Date(d);
                    const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                    return `${day} '${String(date.getFullYear()).slice(2)}`;
                  };
                  const start = conf.startDate ? fmtDate(conf.startDate) : null;

                  const coverageStyle = covered
                    ? COVERAGE_STYLE.committed
                    : considering
                    ? COVERAGE_STYLE.considering
                    : suggested
                    ? COVERAGE_STYLE.suggested
                    : COVERAGE_STYLE.uncovered;

                  const borderStyle = coverageStyle.dashed
                    ? `1px dashed ${coverageStyle.border}`
                    : `1px solid ${coverageStyle.border}`;

                  const orderNum = repOrderMap.get(conf.id);

                  return (
                    <div
                      key={conf.id}
                      className="rounded-xl p-3.5 space-y-2"
                      style={{ background: coverageStyle.bg, border: borderStyle }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          {/* Order number badge when a rep is filtered */}
                          {orderNum != null && (
                            <span
                              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                              style={{ background: 'rgba(244,168,37,0.15)', border: '1px solid rgba(244,168,37,0.3)', color: '#f4a825' }}
                            >
                              {orderNum}
                            </span>
                          )}
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
                              {isRepFiltered && totalStops > 0 && orderNum != null && (
                                <span className="text-accent font-medium">Stop {orderNum} of {totalStops}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {conf.icpScore != null && (
                          <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${conf.icpScore >= 70 ? 'text-accent' : 'text-text3'}`}>
                            {conf.icpScore}
                          </span>
                        )}
                      </div>

                      {(allCommitted.length > 0 || allConsidering.length > 0 || allSuggested.length > 0) && (
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
                          {allSuggested.map((c) => (
                            <span
                              key={c.id}
                              className="text-xs text-accent font-medium px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(244,168,37,0.08)', border: '1px dashed rgba(244,168,37,0.35)' }}
                            >
                              {c.repName} ✦
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
              {isRepFiltered
                ? 'No conferences assigned to this rep in this view.'
                : 'No covered conferences yet. Use "Include uncovered" above to show events the team hasn\'t picked up.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
