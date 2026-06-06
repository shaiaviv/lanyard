'use client';
import { MapPin, Users, AlertTriangle } from 'lucide-react';
import type { Conference } from '@/lib/types';
import type { CoverageRow } from '@/lib/db/queries';
import { Legend } from '@/components/planning/Legend';

interface Props {
  conferences: Conference[];
  coverage: CoverageRow[];
}

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
        label: 'T1, uncovered', labelClass: 'text-text2',
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
  const upcoming = conferences.filter((c) => !c.endDate || c.endDate >= today.slice(0, 7) + '-01');

  const byMonth = new Map<string, Conference[]>();
  for (const conf of upcoming) {
    const key = conf.startDate ? monthKey(conf.startDate) : 'unknown';
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(conf);
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

  const committedConfIds = new Set(
    coverage.filter((c) => c.status === 'committed').map((c) => c.conferenceId),
  );
  const consideringConfIds = new Set(
    coverage.filter((c) => c.status === 'considering').map((c) => c.conferenceId),
  );
  // Under-invested = T1 (must-cover) events with no committed rep. T2 is intentionally excluded:
  // counting T1+T2 surfaced ~135 events and drowned the signal — the nudge should be the short
  // list of events the team genuinely can't afford to skip.
  const uncoveredPriority = upcoming.filter(
    (c) => c.tier === 'T1' && !committedConfIds.has(c.id),
  );

  const clusters: Record<string, { region: string; confs: Conference[] }> = {};
  for (const [key, confs] of byMonth) {
    const regionGroups = new Map<string, Conference[]>();
    for (const c of confs) {
      const r = c.region ?? c.country ?? 'Unknown';
      if (!regionGroups.has(r)) regionGroups.set(r, []);
      regionGroups.get(r)!.push(c);
    }
    for (const [region, rConfs] of regionGroups) {
      if (rConfs.length >= 2) clusters[`${key}-${region}`] = { region, confs: rConfs };
    }
  }

  return (
    <div className="space-y-6">
      {/* Under-invested alert — T1 (must-cover) events with no committed rep */}
      {uncoveredPriority.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-warn flex-shrink-0" />
            <span className="text-sm font-semibold text-warn">
              {uncoveredPriority.length} T1 event{uncoveredPriority.length !== 1 ? 's' : ''} without coverage
            </span>
          </div>

          <div className="space-y-0.5">
            {uncoveredPriority.map((c) => {
              const date = c.startDate
                ? new Date(c.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
                : null;
              const meta = [c.location, date].filter(Boolean).join(' · ');
              return (
                <div key={c.id} className="flex items-center gap-2.5 py-0.5 text-xs" style={{ color: 'rgba(245,158,11,0.85)' }}>
                  <span className="font-bold w-5 flex-shrink-0">T1</span>
                  <span className="flex-1 min-w-0 truncate font-medium">{c.name}</span>
                  {meta && <span className="flex-shrink-0" style={{ color: 'rgba(245,158,11,0.5)' }}>{meta}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clustering opportunities */}
      {Object.values(clusters).length > 0 && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.12)' }}
        >
          <p className="text-sm font-semibold text-blue-400">Trip clustering opportunities</p>
          <p className="text-xs text-blue-400/60">
            Same region, same month — one trip could cover multiple events:
          </p>
          {Object.entries(clusters).map(([key, { region, confs: clusterConfs }]) => (
            <div key={key} className="text-xs text-blue-400/70 mt-1">
              <span className="font-semibold">{region}:</span>{' '}
              {clusterConfs.map((c) => c.name).join(' · ')}
            </div>
          ))}
        </div>
      )}

      {/* Full calendar */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-text1">Full conference calendar</p>
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
                  const isCovered = committedConfIds.has(conf.id);
                  const isConsidering = !isCovered && consideringConfIds.has(conf.id);
                  const isUncoveredPriority = !isCovered && !isConsidering && conf.tier === 'T1';

                  const allCommitted = coverage.filter(
                    (c) => c.conferenceId === conf.id && c.status === 'committed',
                  );
                  const allConsidering = coverage.filter(
                    (c) => c.conferenceId === conf.id && c.status === 'considering',
                  );

                  const start = conf.startDate
                    ? new Date(conf.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    : null;

                  const coverageStyle = isCovered
                    ? COVERAGE_STYLE.committed
                    : isConsidering
                    ? COVERAGE_STYLE.considering
                    : isUncoveredPriority
                    ? COVERAGE_STYLE.uncovered
                    : null;

                  const borderStyle = coverageStyle?.dashed
                    ? `1px dashed ${coverageStyle.border}`
                    : coverageStyle
                    ? `1px solid ${coverageStyle.border}`
                    : '1px solid rgba(255,255,255,0.07)';

                  return (
                    <div
                      key={conf.id}
                      className="rounded-xl p-3.5 space-y-2"
                      style={{
                        background: coverageStyle ? coverageStyle.bg : 'rgba(255,255,255,0.02)',
                        border: borderStyle,
                      }}
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
              No upcoming conferences. Add some in the Conferences tab.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
