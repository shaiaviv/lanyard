'use client';
import { useState, useTransition } from 'react';
import { MapPin, Users, ChevronDown, ChevronUp, Check, UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { assignCoverage, type CoverageStatus } from '@/app/actions/planning';
import type { Conference, Rep } from '@/lib/types';
import type { CoverageRow } from '@/lib/db/queries';

const VERTICALS = ['All', 'Fintech', 'Payments', 'Travel', 'SaaS', 'Banking'];
const TIERS: Array<'All' | 'T1' | 'T2' | 'T3'> = ['All', 'T1', 'T2', 'T3'];

const FACTOR_LABELS: Record<string, string> = {
  icpDensity:     'ICP Density',
  topicFit:       'Topic Fit',
  scale:          'Scale',
  geoRelevance:   'Geo Relevance',
  historicalPerf: 'Historical Perf',
};

const STATUS_CYCLE: { value: CoverageStatus; label: string; chip: string }[] = [
  { value: 'considering', label: 'Considering', chip: 'text-blue-300 bg-blue-400/10 border-blue-400/20' },
  { value: 'committed',   label: 'Committed',   chip: 'text-success bg-success/10 border-success/20' },
  { value: 'declined',    label: 'Declined',    chip: 'text-text3 bg-white/5 border-white/10' },
];

function firstName(name: string) {
  return name.split(' ')[0];
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/6">
        <div className="h-full rounded-full score-bar-fill" style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold tabular-nums w-6 text-right leading-none ${
        score >= 75 ? 'text-accent' : score >= 55 ? 'text-text2' : 'text-text3'
      }`}>{score}</span>
    </div>
  );
}

/**
 * Team coverage control. Summarizes who's covering a conference and lets the lead
 * assign ANY teammate a status. This is the heart of company-wide planning — coverage
 * is "who covers what" across the team, not just the current rep's personal plan.
 */
function CoverageControl({
  coverageForConf,
  reps,
  currentRepId,
  onAssign,
}: {
  coverageForConf: CoverageRow[];
  reps: Rep[];
  currentRepId: string;
  onAssign: (repId: string, status: CoverageStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingRepId, setPendingRepId] = useState<string | null>(null);

  const statusByRep = new Map(coverageForConf.map((c) => [c.repId, c.status]));
  const committed = coverageForConf.filter((c) => c.status === 'committed');
  const considering = coverageForConf.filter((c) => c.status === 'considering');

  function set(repId: string, status: CoverageStatus) {
    setPendingRepId(repId);
    startTransition(async () => {
      await onAssign(repId, status);
      setPendingRepId(null);
    });
  }

  // Summary pill: green if anyone committed, blue if only considering, amber "Uncovered" otherwise.
  let summary: React.ReactNode;
  if (committed.length > 0) {
    summary = (
      <span className="flex items-center gap-1 text-success">
        <Check size={11} />
        {committed.map((c) => firstName(c.repName)).join(', ')}
      </span>
    );
  } else if (considering.length > 0) {
    summary = (
      <span className="text-blue-300">{considering.map((c) => firstName(c.repName)).join(', ')} considering</span>
    );
  } else {
    summary = <span className="text-warn">Uncovered</span>;
  }

  const summaryClass =
    committed.length > 0
      ? 'border-success/20 bg-success/8'
      : considering.length > 0
        ? 'border-blue-400/20 bg-blue-400/8'
        : 'border-warn/25 bg-warn/8';

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${summaryClass}`}
      >
        {summary}
        <ChevronDown size={11} className="opacity-60" />
      </button>

      {open && (
        <>
          {/* click-away */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-card rounded-xl py-2 min-w-[240px] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-white/6">
              <span className="text-[11px] font-semibold text-text3 flex items-center gap-1.5">
                <UserPlus size={12} /> Team coverage
              </span>
              <button onClick={() => setOpen(false)} className="text-text3 hover:text-text1">
                <X size={13} />
              </button>
            </div>
            {reps.map((rep) => {
              const cur = statusByRep.get(rep.id) as CoverageStatus | undefined;
              const rowPending = isPending && pendingRepId === rep.id;
              return (
                <div key={rep.id} className="px-3 py-1.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-text1 font-medium truncate">
                      {rep.name}
                      {rep.id === currentRepId && <span className="text-text3 font-normal"> (You)</span>}
                    </span>
                  </div>
                  <div className={`flex gap-1 ${rowPending ? 'opacity-40 pointer-events-none' : ''}`}>
                    {STATUS_CYCLE.map((s) => {
                      const active = cur === s.value;
                      return (
                        <button
                          key={s.value}
                          onClick={() => set(rep.id, active ? 'declined' : s.value)}
                          className={`flex-1 text-[11px] font-semibold px-1.5 py-1 rounded-md border transition-all ${
                            active ? s.chip : 'text-text3 bg-white/3 border-white/6 hover:border-white/12'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ConferenceCard({
  conf,
  coverageForConf,
  reps,
  currentRepId,
  onAssign,
}: {
  conf: Conference;
  coverageForConf: CoverageRow[];
  reps: Rep[];
  currentRepId: string;
  onAssign: (repId: string, confId: string, status: CoverageStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const isActive = conf.startDate && conf.endDate && conf.startDate <= today && today <= conf.endDate;
  const isPast = conf.endDate && conf.endDate < today;

  const start = conf.startDate
    ? new Date(conf.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;
  const end = conf.endDate
    ? new Date(conf.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div
      className={`relative bg-card rounded-2xl border border-white/7 overflow-hidden transition-all ${
        isPast ? 'opacity-50' : 'hover:-translate-y-px hover:border-white/12'
      }`}
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.35)' }}
    >
      {/* Tier accent stripe — top only, not a side stripe */}
      {conf.tier === 'T1' && (
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400/90 via-amber-400/60 to-transparent" />
      )}
      {conf.tier === 'T2' && (
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-400/70 via-blue-400/40 to-transparent" />
      )}

      <div className="px-4 pt-4 pb-4">
        {/* Top row: badges + coverage control */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isActive && <Badge variant="live" dot pulse>Live</Badge>}
            {conf.tier && <Badge variant={conf.tier as 'T1' | 'T2' | 'T3'}>{conf.tier}</Badge>}
          </div>
          {!isPast && (
            <CoverageControl
              coverageForConf={coverageForConf}
              reps={reps}
              currentRepId={currentRepId}
              onAssign={(repId, status) => onAssign(repId, conf.id, status)}
            />
          )}
        </div>

        {/* Name */}
        <h3 className="text-base font-bold text-text1 leading-snug mb-1.5">{conf.name}</h3>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-text3 flex-wrap">
          {start && end && <span>{start} – {end}</span>}
          {conf.location && (
            <span className="flex items-center gap-1"><MapPin size={10} /> {conf.location}</span>
          )}
          {conf.estAudience && (
            <span className="flex items-center gap-1"><Users size={10} /> {conf.estAudience.toLocaleString()}</span>
          )}
        </div>

        {/* ICP score */}
        {conf.icpScore != null && (
          <div className="mt-3">
            <ScoreBar score={conf.icpScore} />
          </div>
        )}

        {/* Vertical tags */}
        {conf.verticals.length > 0 && (
          <div className="flex gap-1 mt-2.5 flex-wrap">
            {conf.verticals.map((v) => (
              <span key={v} className="text-[11px] text-text3 rounded-md px-1.5 py-0.5 bg-white/4">
                {v}
              </span>
            ))}
          </div>
        )}

        {/* AI breakdown toggle */}
        {conf.scoreBreakdown && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-text3 hover:text-text2 mt-3 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            AI scoring breakdown
          </button>
        )}
      </div>

      {expanded && conf.scoreBreakdown && (
        <div className="px-5 py-3 space-y-2.5 border-t border-white/6 bg-white/[0.015]">
          {Object.entries(conf.scoreBreakdown.factors)
            .filter(([, v]) => v !== null)
            .map(([key, factor]) => {
              const f = factor as { score: number; rationale: string };
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text2">
                      {FACTOR_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase())}
                    </span>
                  </div>
                  <ScoreBar score={f.score} />
                  <p className="text-[11px] text-text3 mt-1 leading-snug">{f.rationale}</p>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

interface Props {
  conferences: Conference[];
  coverage: CoverageRow[];
  reps: Rep[];
  repId: string;
}

export function ConferenceList({ conferences, coverage, reps, repId }: Props) {
  const [vertical, setVertical] = useState('All');
  const [tier, setTier] = useState<'All' | 'T1' | 'T2' | 'T3'>('All');
  const [showPast, setShowPast] = useState(false);
  // Coverage is interactive — lift it into state so assignments reflect instantly
  // in the cards AND the under-invested banner without a full reload.
  const [coverageState, setCoverageState] = useState<CoverageRow[]>(coverage);

  const today = new Date().toISOString().split('T')[0];

  function handleAssign(repIdArg: string, confId: string, status: CoverageStatus) {
    // optimistic upsert into local state
    setCoverageState((prev) => {
      const idx = prev.findIndex((c) => c.repId === repIdArg && c.conferenceId === confId);
      const repName = reps.find((r) => r.id === repIdArg)?.name ?? 'Unknown';
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], status };
        return next;
      }
      return [...prev, { id: `${repIdArg}-${confId}`, repId: repIdArg, repName, conferenceId: confId, status }];
    });
    void assignCoverage(repIdArg, confId, status);
  }

  const coverageByConf = new Map<string, CoverageRow[]>();
  for (const c of coverageState) {
    if (!coverageByConf.has(c.conferenceId)) coverageByConf.set(c.conferenceId, []);
    coverageByConf.get(c.conferenceId)!.push(c);
  }

  const filtered = conferences
    .filter((c) => {
      if (!showPast && c.endDate && c.endDate < today) return false;
      if (vertical !== 'All' && !c.verticals.includes(vertical)) return false;
      if (tier !== 'All' && c.tier !== tier) return false;
      return true;
    })
    .sort((a, b) => (b.icpScore ?? 0) - (a.icpScore ?? 0));

  // Team-wide: a conference is "covered" when ANY rep has committed.
  const committedConfIds = new Set(
    coverageState.filter((c) => c.status === 'committed').map((c) => c.conferenceId),
  );
  const uncoveredT1 = conferences.filter(
    (c) => c.tier === 'T1' && !committedConfIds.has(c.id) && (!c.endDate || c.endDate >= today),
  );
  const coveredUpcoming = conferences.filter(
    (c) => committedConfIds.has(c.id) && (!c.endDate || c.endDate >= today),
  ).length;

  return (
    <div className="space-y-4">
      {/* Under-invested banner (team-wide) */}
      {uncoveredT1.length > 0 && (
        <div className="rounded-xl px-4 py-3 space-y-0.5 bg-warn/[0.06] border border-warn/15">
          <p className="text-sm font-semibold text-warn">
            {uncoveredT1.length} T1 event{uncoveredT1.length !== 1 ? 's' : ''} with no committed rep
          </p>
          <p className="text-xs text-warn/60">
            {uncoveredT1.slice(0, 2).map((c) => c.name).join(', ')}
            {uncoveredT1.length > 2 ? ` +${uncoveredT1.length - 2} more` : ''}
          </p>
        </div>
      )}

      {/* Single-row combined filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              tier === t
                ? 'bg-accent text-[#07090F]'
                : 'text-text2 hover:text-text1 bg-white/4 border border-white/8'
            }`}
          >
            {t === 'All' ? `All (${conferences.length})` : `${t} · ${conferences.filter((c) => c.tier === t).length}`}
          </button>
        ))}
        <div className="w-px bg-white/10 flex-shrink-0 self-stretch mx-0.5" />
        {VERTICALS.filter((v) => v !== 'All').map((v) => (
          <button
            key={v}
            onClick={() => setVertical(vertical === v ? 'All' : v)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              vertical === v
                ? 'bg-elevated text-text1 border border-white/15'
                : 'text-text3 hover:text-text2 bg-white/3 border border-white/6'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Stats + show past */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text3">
          {filtered.length} shown
          <span className="text-text3/30 mx-2">·</span>
          <span className="text-text1 font-semibold">{coveredUpcoming}</span> covered by the team
        </p>
        <button
          onClick={() => setShowPast(!showPast)}
          className="text-xs text-text3 hover:text-text2 transition-colors"
        >
          {showPast ? 'Hide past' : 'Show past'}
        </button>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((conf) => (
          <ConferenceCard
            key={conf.id}
            conf={conf}
            coverageForConf={coverageByConf.get(conf.id) ?? []}
            reps={reps}
            currentRepId={repId}
            onAssign={handleAssign}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-text3">
          No conferences match the current filters.
        </div>
      )}
    </div>
  );
}
