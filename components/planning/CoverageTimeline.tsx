'use client';
import { MapPin, Users } from 'lucide-react';
import type { Conference } from '@/lib/types';
import type { CoverageRow } from '@/lib/db/queries';

interface Props {
  conferences: Conference[];
  coverage: CoverageRow[];
  repId: string;
  repName: string;
}

const MY_STATUS_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  committed:  { bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.15)',  text: 'text-success' },
  considering:{ bg: 'rgba(96,165,250,0.05)',  border: 'rgba(96,165,250,0.12)',  text: 'text-blue-400' },
  attended:   { bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.12)',  text: 'text-success' },
  declined:   { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.06)', text: 'text-text3' },
};

const TIER_DOT: Record<string, string> = {
  T1: 'bg-amber-400',
  T2: 'bg-blue-400',
  T3: 'bg-[rgba(255,255,255,0.2)]',
};

function monthKey(date: string) { return date.slice(0, 7); }

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function CoverageTimeline({ conferences, coverage, repId, repName }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const upcoming = conferences.filter((c) => !c.endDate || c.endDate >= today.slice(0, 7) + '-01');

  const byMonth = new Map<string, Conference[]>();
  for (const conf of upcoming) {
    const key = conf.startDate ? monthKey(conf.startDate) : 'unknown';
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(conf);
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

  const myStatusMap = Object.fromEntries(
    coverage.filter((c) => c.repId === repId).map((c) => [c.conferenceId, c.status]),
  );
  const committedConfIds = new Set(
    coverage.filter((c) => c.status === 'committed').map((c) => c.conferenceId),
  );
  const uncoveredT1T2 = upcoming.filter(
    (c) => (c.tier === 'T1' || c.tier === 'T2') && !committedConfIds.has(c.id),
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
      {/* Under-invested alert */}
      {uncoveredT1T2.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.14)' }}
        >
          <p className="text-sm font-semibold text-warn">
            Under-invested: {uncoveredT1T2.length} priority event{uncoveredT1T2.length !== 1 ? 's' : ''} without a committed rep
          </p>
          <div className="space-y-1">
            {uncoveredT1T2.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(245,158,11,0.7)' }}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TIER_DOT[c.tier ?? 'T3']}`} />
                <span className="font-semibold">{c.tier}</span>
                <span>{c.name}</span>
                {c.startDate && (
                  <span style={{ color: 'rgba(245,158,11,0.5)' }}>
                    · {new Date(c.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
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
            These conferences are in the same region in the same month — one trip could cover multiple events:
          </p>
          {Object.entries(clusters).map(([key, { region, confs: clusterConfs }]) => (
            <div key={key} className="text-xs text-blue-400/70 mt-1">
              <span className="font-semibold">{region}:</span>{' '}
              {clusterConfs.map((c) => c.name).join(' · ')}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="text-text3">Your status:</span>
        {(['committed', 'considering', 'declined'] as const).map((s) => {
          const st = MY_STATUS_STYLE[s];
          return (
            <span
              key={s}
              className={`px-2 py-0.5 rounded font-medium ${st.text}`}
              style={{ background: st.bg, border: `1px solid ${st.border}` }}
            >
              {s}
            </span>
          );
        })}
      </div>

      {/* Month timeline */}
      <div className="space-y-8">
        {months.map(([month, confs]) => (
          <div key={month}>
            <h3 className="text-[10px] font-bold text-text3 uppercase tracking-widest mb-3">
              {monthLabel(month)}
            </h3>
            <div className="space-y-2.5">
              {confs.map((conf) => {
                const myStatus = myStatusMap[conf.id];
                const st = myStatus ? MY_STATUS_STYLE[myStatus] : null;
                const allCommitted = coverage.filter(
                  (c) => c.conferenceId === conf.id && c.status === 'committed',
                );
                const start = conf.startDate
                  ? new Date(conf.startDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : null;

                return (
                  <div
                    key={conf.id}
                    className="rounded-xl p-3.5 space-y-2"
                    style={{
                      background: st ? st.bg : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${st ? st.border : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {conf.tier && (
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TIER_DOT[conf.tier]}`} />
                          )}
                          <p className="text-sm font-semibold text-text1 truncate">{conf.name}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text3">
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
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            conf.icpScore >= 70 ? 'text-accent' : 'text-text3'
                          }`}
                        >
                          {conf.icpScore}
                        </span>
                      )}
                    </div>

                    {allCommitted.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {allCommitted.map((c) => (
                          <span
                            key={c.id}
                            className="text-xs text-success font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
                          >
                            {c.repId === repId ? repName : c.repName}
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
  );
}
