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

const STATUS_STYLE: Record<string, string> = {
  committed: 'bg-orange-100 border-orange-300 text-orange-800',
  considering: 'bg-blue-50 border-blue-200 text-blue-700',
  attended: 'bg-green-50 border-green-200 text-green-700',
  declined: 'bg-zinc-50 border-zinc-200 text-zinc-400 line-through',
};

const TIER_DOT: Record<string, string> = {
  T1: 'bg-orange-500',
  T2: 'bg-blue-400',
  T3: 'bg-zinc-300',
};

function monthKey(date: string) {
  return date.slice(0, 7); // "YYYY-MM"
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function CoverageTimeline({ conferences, coverage, repId, repName }: Props) {
  const today = new Date().toISOString().split('T')[0];

  // Only show conferences from current month onwards
  const upcoming = conferences.filter((c) => !c.endDate || c.endDate >= today.slice(0, 7) + '-01');

  // Group by month of start_date
  const byMonth = new Map<string, Conference[]>();
  for (const conf of upcoming) {
    const key = conf.startDate ? monthKey(conf.startDate) : 'unknown';
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(conf);
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Status map: conferenceId → status for current rep
  const myStatusMap = Object.fromEntries(
    coverage.filter((c) => c.repId === repId).map((c) => [c.conferenceId, c.status]),
  );

  // Coverage gaps: T1/T2 with no committed rep
  const committedConfIds = new Set(
    coverage.filter((c) => c.status === 'committed').map((c) => c.conferenceId),
  );
  const uncoveredT1T2 = upcoming.filter(
    (c) => (c.tier === 'T1' || c.tier === 'T2') && !committedConfIds.has(c.id),
  );

  // Geographic clustering: find conferences within the same month in the same region
  const clusters: Record<string, { region: string; confs: Conference[] }> = {};
  for (const [key, confs] of byMonth) {
    const regionGroups = new Map<string, Conference[]>();
    for (const c of confs) {
      const r = c.region ?? c.country ?? 'Unknown';
      if (!regionGroups.has(r)) regionGroups.set(r, []);
      regionGroups.get(r)!.push(c);
    }
    for (const [region, rConfs] of regionGroups) {
      if (rConfs.length >= 2) {
        clusters[`${key}-${region}`] = { region, confs: rConfs };
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Under-invested alert */}
      {uncoveredT1T2.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-900">Under-invested: {uncoveredT1T2.length} priority event{uncoveredT1T2.length !== 1 ? 's' : ''} without a committed rep</p>
          <div className="space-y-1">
            {uncoveredT1T2.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs text-amber-700">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TIER_DOT[c.tier ?? 'T3']}`} />
                <span className="font-medium">{c.tier}</span>
                <span>{c.name}</span>
                {c.startDate && <span className="text-amber-500">· {new Date(c.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geographic clusters */}
      {Object.values(clusters).length > 0 && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-900">Trip clustering opportunities</p>
          <p className="text-xs text-blue-700">These conferences are in the same region in the same month — one trip could cover multiple events:</p>
          {Object.entries(clusters).map(([key, { region, confs: clusterConfs }]) => (
            <div key={key} className="text-xs text-blue-700 mt-1">
              <span className="font-semibold">{region}:</span>{' '}
              {clusterConfs.map((c) => c.name).join(' · ')}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span>Your status:</span>
        {['committed', 'considering', 'declined'].map((s) => (
          <span key={s} className={`px-2 py-0.5 rounded border font-medium ${STATUS_STYLE[s]}`}>
            {s}
          </span>
        ))}
      </div>

      {/* Month timeline */}
      <div className="space-y-8">
        {months.map(([month, confs]) => (
          <div key={month}>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              {monthLabel(month)}
            </h3>
            <div className="space-y-2.5">
              {confs.map((conf) => {
                const myStatus = myStatusMap[conf.id];
                const allCommitted = coverage.filter((c) => c.conferenceId === conf.id && c.status === 'committed');
                const start = conf.startDate
                  ? new Date(conf.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  : null;

                return (
                  <div
                    key={conf.id}
                    className={`border rounded-xl p-3.5 space-y-2 ${myStatus ? STATUS_STYLE[myStatus] ?? 'border-zinc-200' : 'border-zinc-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {conf.tier && (
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TIER_DOT[conf.tier]}`} />
                          )}
                          <p className="text-sm font-semibold text-zinc-900 truncate">{conf.name}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
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
                        <span className={`text-xs font-bold tabular-nums ${conf.icpScore >= 70 ? 'text-orange-600' : 'text-zinc-400'}`}>
                          {conf.icpScore}
                        </span>
                      )}
                    </div>

                    {/* Rep coverage */}
                    {allCommitted.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        {allCommitted.map((c) => (
                          <span key={c.id} className="bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
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
          <div className="text-center py-16 text-sm text-zinc-400">
            No upcoming conferences. Add some in the Conferences tab.
          </div>
        )}
      </div>
    </div>
  );
}
