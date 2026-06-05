'use client';
import { useState, useTransition } from 'react';
import { MapPin, Users, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { upsertCoverage } from '@/app/actions/planning';
import type { Conference } from '@/lib/types';
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

const STATUS_OPTIONS = [
  { value: 'considering', label: 'Considering' },
  { value: 'committed',   label: 'Committed ✓' },
  { value: 'declined',    label: 'Declined' },
] as const;

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

function CoverageButton({
  conference,
  currentStatus,
  repId,
}: {
  conference: Conference;
  currentStatus: string | undefined;
  repId: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function select(val: string) {
    setOpen(false);
    startTransition(async () => {
      const result = await upsertCoverage(
        conference.id,
        val as 'considering' | 'committed' | 'attended' | 'declined',
      );
      if (!('error' in result)) setStatus(val);
    });
  }

  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'Add to plan';
  const isCommitted = status === 'committed';

  let btnClass: string;
  if (isCommitted) {
    btnClass = 'bg-success/8 border-success/20 text-success';
  } else if (status) {
    btnClass = 'bg-white/4 border-white/10 text-text2';
  } else {
    btnClass = 'bg-accent/8 border-accent/20 text-accent hover:bg-accent/12';
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${btnClass}`}
      >
        {isCommitted && <Check size={11} />}
        {label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-card rounded-xl py-1 min-w-[140px] border border-white/10 shadow-2xl">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => select(o.value)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-elevated transition-colors ${
                status === o.value ? 'text-accent font-semibold' : 'text-text2'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConferenceCard({
  conf,
  myStatus,
  repId,
}: {
  conf: Conference;
  myStatus: string | undefined;
  repId: string;
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
        {/* Top row: badges + action button */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isActive && <Badge variant="live" dot pulse>Live</Badge>}
            {conf.tier && <Badge variant={conf.tier as 'T1' | 'T2' | 'T3'}>{conf.tier}</Badge>}
          </div>
          <CoverageButton conference={conf} currentStatus={myStatus} repId={repId} />
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
  repId: string;
}

export function ConferenceList({ conferences, coverage, repId }: Props) {
  const [vertical, setVertical] = useState('All');
  const [tier, setTier] = useState<'All' | 'T1' | 'T2' | 'T3'>('All');
  const [showPast, setShowPast] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const myStatusMap = Object.fromEntries(
    coverage.filter((c) => c.repId === repId).map((c) => [c.conferenceId, c.status]),
  );

  const filtered = conferences
    .filter((c) => {
      if (!showPast && c.endDate && c.endDate < today) return false;
      if (vertical !== 'All' && !c.verticals.includes(vertical)) return false;
      if (tier !== 'All' && c.tier !== tier) return false;
      return true;
    })
    .sort((a, b) => (b.icpScore ?? 0) - (a.icpScore ?? 0));

  const uncommittedT1 = conferences.filter(
    (c) => c.tier === 'T1' && !myStatusMap[c.id] && (!c.endDate || c.endDate >= today),
  );
  const committedCount = Object.values(myStatusMap).filter((s) => s === 'committed').length;

  return (
    <div className="space-y-4">
      {/* Under-invested banner */}
      {uncommittedT1.length > 0 && (
        <div className="rounded-xl px-4 py-3 space-y-0.5 bg-warn/[0.06] border border-warn/15">
          <p className="text-sm font-semibold text-warn">
            {uncommittedT1.length} T1 event{uncommittedT1.length !== 1 ? 's' : ''} without coverage
          </p>
          <p className="text-xs text-warn/60">
            {uncommittedT1.slice(0, 2).map((c) => c.name).join(', ')}
            {uncommittedT1.length > 2 ? ` +${uncommittedT1.length - 2} more` : ''}
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
          <span className="text-text1 font-semibold">{committedCount}</span> committed
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
            myStatus={myStatusMap[conf.id]}
            repId={repId}
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
