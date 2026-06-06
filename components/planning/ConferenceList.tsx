'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MapPin, Users, ChevronDown, ChevronUp, Check, UserPlus, X, Sparkles, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ScoringWeightsPanel } from '@/components/planning/ScoringWeightsPanel';
import { DiscoverPanel } from '@/components/planning/DiscoverPanel';
import { assignCoverage, rescoreConference, type CoverageStatus } from '@/app/actions/planning';
import { computeIcpScore, type ScoringWeights, type Tier } from '@/lib/scoring/computeIcpScore';
import type { Conference, Rep } from '@/lib/types';
import type { CoverageRow } from '@/lib/db/queries';

const VERTICALS = ['All', 'Fintech', 'Payments', 'Treasury', 'Travel', 'SaaS', 'Banking'];
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

// A conference plus its LIVE score/tier (recomputed from the AI breakdown + current weights).
type ConfView = Conference & { liveScore: number | null; liveTier: Tier | null };

function firstName(name: string) {
  return name.split(' ')[0];
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/6">
        <div className="h-full rounded-full score-bar-fill transition-all duration-300" style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold tabular-nums w-6 text-right leading-none transition-colors ${
        score >= 75 ? 'text-accent' : score >= 55 ? 'text-text2' : 'text-text3'
      }`}>{score}</span>
    </div>
  );
}

/**
 * Post-event outcome control — for past conferences. Shows only reps who were committed and
 * lets the user record whether they actually attended or declined.
 */
function PastCoverageControl({
  coverageForConf,
  reps,
  onAssign,
}: {
  coverageForConf: CoverageRow[];
  reps: Rep[];
  onAssign: (repId: string, status: CoverageStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingRepId, setPendingRepId] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxH: number } | null>(null);

  // Only reps with a relevant past-event status.
  const relevant = coverageForConf.filter((c) =>
    c.status === 'committed' || c.status === 'attended' || c.status === 'declined',
  );

  if (relevant.length === 0) return null;

  const attended = relevant.filter((c) => c.status === 'attended');
  const committed = relevant.filter((c) => c.status === 'committed');

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 240;
    const margin = 8;
    const left = Math.max(margin, Math.min(r.right - width, window.innerWidth - width - margin));
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const spaceAbove = r.top - margin;
    const up = spaceBelow < 260 && spaceAbove > spaceBelow;
    const maxH = Math.min(Math.round(window.innerHeight * 0.7), up ? spaceAbove : spaceBelow);
    setPos(up ? { left, width, maxH, bottom: window.innerHeight - r.top + 6 } : { left, width, maxH, top: r.bottom + 6 });
  }

  function toggle() {
    if (!open) place();
    setOpen((o) => !o);
  }

  function set(repId: string, status: CoverageStatus) {
    setPendingRepId(repId);
    startTransition(async () => {
      await onAssign(repId, status);
      setPendingRepId(null);
    });
  }

  let summary: React.ReactNode;
  if (attended.length > 0 && committed.length === 0) {
    summary = <span className="text-success/70">✓ {attended.map((c) => firstName(c.repName)).join(', ')}</span>;
  } else if (committed.length > 0) {
    summary = <span className="text-text3">Awaiting outcome · {committed.map((c) => firstName(c.repName)).join(', ')}</span>;
  } else {
    summary = <span className="text-text3/50">Outcomes recorded</span>;
  }

  return (
    <div className="flex-shrink-0">
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/3 transition-all hover:border-white/16"
      >
        {summary}
        <ChevronDown size={11} className="opacity-40" />
      </button>

      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-card rounded-xl py-2 border border-white/10 shadow-2xl overflow-y-auto"
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxH }}
          >
            <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-white/6 sticky top-0 bg-card">
              <span className="text-[11px] font-semibold text-text3">Record outcome</span>
              <button onClick={() => setOpen(false)} className="text-text3 hover:text-text1"><X size={13} /></button>
            </div>
            {relevant.map((row) => {
              const rowPending = isPending && pendingRepId === row.repId;
              const isAttended = row.status === 'attended';
              const isDeclined = row.status === 'declined';
              const repInfo = reps.find((r) => r.id === row.repId);
              return (
                <div key={row.repId} className={`px-3 py-2 ${rowPending ? 'opacity-40 pointer-events-none' : ''}`}>
                  <p className="text-xs font-medium text-text1 mb-1.5 truncate">{repInfo?.name ?? row.repName}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => set(row.repId, isAttended ? 'committed' : 'attended')}
                      className={`flex-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-all ${
                        isAttended
                          ? 'text-success bg-success/10 border-success/20'
                          : 'text-text3 bg-white/3 border-white/8 hover:border-white/14'
                      }`}
                    >
                      {isAttended ? '✓ Attended' : 'Attended'}
                    </button>
                    <button
                      onClick={() => set(row.repId, isDeclined ? 'committed' : 'declined')}
                      className={`flex-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-all ${
                        isDeclined
                          ? 'text-text2 bg-white/8 border-white/18'
                          : 'text-text3 bg-white/3 border-white/8 hover:border-white/14'
                      }`}
                    >
                      {isDeclined ? '✗ Declined' : 'Declined'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

/**
 * Team coverage control — assign ANY teammate a status. The heart of company-wide planning
 * ("who covers what"), not just the current rep's personal plan.
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
  const btnRef = useRef<HTMLButtonElement>(null);
  // Popover is portaled to <body> so the card's overflow-hidden can't clip it.
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxH: number } | null>(null);

  const statusByRep = new Map(coverageForConf.map((c) => [c.repId, c.status]));
  const committed = coverageForConf.filter((c) => c.status === 'committed');
  const considering = coverageForConf.filter((c) => c.status === 'considering');

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 260;
    const margin = 8;
    const left = Math.max(margin, Math.min(r.right - width, window.innerWidth - width - margin));
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const spaceAbove = r.top - margin;
    // Flip up when there isn't enough room below; cap height + scroll either way.
    const up = spaceBelow < 300 && spaceAbove > spaceBelow;
    const maxH = Math.min(Math.round(window.innerHeight * 0.7), up ? spaceAbove : spaceBelow);
    setPos(
      up
        ? { left, width, maxH, bottom: window.innerHeight - r.top + 6 }
        : { left, width, maxH, top: r.bottom + 6 },
    );
  }

  function toggle() {
    if (!open) place();
    setOpen((o) => !o);
  }

  // Reposition / close on scroll + resize so the fixed popover never drifts.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function set(repId: string, status: CoverageStatus) {
    setPendingRepId(repId);
    startTransition(async () => {
      await onAssign(repId, status);
      setPendingRepId(null);
    });
  }

  let summary: React.ReactNode;
  if (committed.length > 0) {
    summary = (
      <span className="flex items-center gap-1 text-success">
        <Check size={11} />
        {committed.map((c) => firstName(c.repName)).join(', ')}
      </span>
    );
  } else if (considering.length > 0) {
    summary = <span className="text-blue-300">{considering.map((c) => firstName(c.repName)).join(', ')} considering</span>;
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
    <div className="flex-shrink-0">
      <button
        ref={btnRef}
        onClick={toggle}
        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${summaryClass}`}
      >
        {summary}
        <ChevronDown size={11} className="opacity-60" />
      </button>

      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-card rounded-xl py-2 border border-white/10 shadow-2xl overflow-y-auto"
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxH }}
          >
            <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-white/6 sticky top-0 bg-card">
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
        </>,
        document.body,
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
  conf: ConfView;
  coverageForConf: CoverageRow[];
  reps: Rep[];
  currentRepId: string;
  onAssign: (repId: string, confId: string, status: CoverageStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isRescoring, startRescore] = useTransition();
  const [rescoreErr, setRescoreErr] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const isActive = conf.startDate && conf.endDate && conf.startDate <= today && today <= conf.endDate;
  const isPast = conf.endDate && conf.endDate < today;

  const start = conf.startDate
    ? new Date(conf.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;
  const end = conf.endDate
    ? new Date(conf.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  function rescore() {
    setRescoreErr(null);
    startRescore(async () => {
      const res = await rescoreConference(conf.id);
      if ('error' in res) setRescoreErr(res.error);
    });
  }

  return (
    <div
      className={`relative bg-card rounded-2xl border border-white/7 overflow-hidden transition-all ${
        isPast ? 'opacity-50' : 'hover:-translate-y-px hover:border-white/12'
      }`}
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.35)' }}
    >
      {conf.liveTier === 'T1' && (
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400/90 via-amber-400/60 to-transparent" />
      )}
      {conf.liveTier === 'T2' && (
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-400/70 via-blue-400/40 to-transparent" />
      )}

      <div className="px-4 pt-4 pb-4">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isActive && <Badge variant="live" dot pulse>Live</Badge>}
            {conf.liveTier && <Badge variant={conf.liveTier as 'T1' | 'T2' | 'T3'}>{conf.liveTier}</Badge>}
          </div>
          {isPast ? (
            <PastCoverageControl
              coverageForConf={coverageForConf}
              reps={reps}
              onAssign={(repId, status) => onAssign(repId, conf.id, status)}
            />
          ) : (
            <CoverageControl
              coverageForConf={coverageForConf}
              reps={reps}
              currentRepId={currentRepId}
              onAssign={(repId, status) => onAssign(repId, conf.id, status)}
            />
          )}
        </div>

        <Link href={`/planning/conference/${conf.id}`} className="block group">
          <h3 className="text-base font-bold text-text1 leading-snug mb-1.5 group-hover:text-accent transition-colors">{conf.name}</h3>
        </Link>

        <div className="flex items-center gap-3 text-xs text-text3 flex-wrap">
          {start && end && <span>{start} – {end}</span>}
          {conf.location && (
            <span className="flex items-center gap-1"><MapPin size={10} /> {conf.location}</span>
          )}
          {conf.estAudience && (
            <span className="flex items-center gap-1"><Users size={10} /> {conf.estAudience.toLocaleString()}</span>
          )}
        </div>

        {conf.liveScore != null && (
          <div className="mt-3">
            <ScoreBar score={conf.liveScore} />
          </div>
        )}

        {conf.verticals.length > 0 && (
          <div className="flex gap-1 mt-2.5 flex-wrap">
            {conf.verticals.map((v) => (
              <span key={v} className="text-[11px] text-text3 rounded-md px-1.5 py-0.5 bg-white/4">
                {v}
              </span>
            ))}
          </div>
        )}

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
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={rescore}
              disabled={isRescoring}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 disabled:opacity-50 transition-colors"
            >
              {isRescoring ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {isRescoring ? 'Re-scoring…' : 'Re-score with AI'}
            </button>
            {rescoreErr && <span className="text-[11px] text-red-400">{rescoreErr}</span>}
          </div>
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
  weights: ScoringWeights;
}

export function ConferenceList({ conferences, coverage, reps, repId, weights: initialWeights }: Props) {
  const [vertical, setVertical] = useState('All');
  const [tier, setTier] = useState<'All' | 'T1' | 'T2' | 'T3'>('All');
  const [showPast, setShowPast] = useState(false);
  const [coverageState, setCoverageState] = useState<CoverageRow[]>(coverage);
  // Live weights — drives instant client-side recompute of every score/tier (no AI call).
  const [weights, setWeights] = useState<ScoringWeights>(initialWeights);
  const [showDiscover, setShowDiscover] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  function handleAssign(repIdArg: string, confId: string, status: CoverageStatus) {
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

  // Recompute live score/tier for every conference from its AI breakdown + current weights.
  const scored: ConfView[] = conferences.map((c) => {
    if (c.scoreBreakdown) {
      const { score, tier: t } = computeIcpScore(c.scoreBreakdown, weights);
      return { ...c, liveScore: score, liveTier: t };
    }
    return { ...c, liveScore: c.icpScore, liveTier: (c.tier as Tier | null) ?? null };
  });

  const coverageByConf = new Map<string, CoverageRow[]>();
  for (const c of coverageState) {
    if (!coverageByConf.has(c.conferenceId)) coverageByConf.set(c.conferenceId, []);
    coverageByConf.get(c.conferenceId)!.push(c);
  }

  const filtered = scored
    .filter((c) => {
      if (!showPast && c.endDate && c.endDate < today) return false;
      if (vertical !== 'All' && !c.verticals.some((v) => v.toLowerCase() === vertical.toLowerCase())) return false;
      if (tier !== 'All' && c.liveTier !== tier) return false;
      return true;
    })
    .sort((a, b) => (b.liveScore ?? 0) - (a.liveScore ?? 0));

  const committedConfIds = new Set(
    coverageState.filter((c) => c.status === 'committed').map((c) => c.conferenceId),
  );
  const uncoveredT1 = scored.filter(
    (c) => c.liveTier === 'T1' && !committedConfIds.has(c.id) && (!c.endDate || c.endDate >= today),
  );
  const coveredUpcoming = scored.filter(
    (c) => committedConfIds.has(c.id) && (!c.endDate || c.endDate >= today),
  ).length;
  const tierCount = (t: 'T1' | 'T2' | 'T3') => scored.filter((c) => c.liveTier === t).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowDiscover((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
            showDiscover
              ? 'bg-accent/15 border-accent/30 text-accent'
              : 'bg-accent/8 border-accent/20 text-accent hover:bg-accent/12'
          }`}
        >
          <Sparkles size={12} /> Discover events with AI
        </button>
      </div>

      {showDiscover && <DiscoverPanel />}

      <ScoringWeightsPanel weights={weights} onChange={setWeights} />

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
            {t === 'All' ? `All (${conferences.length})` : `${t} · ${tierCount(t)}`}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
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
