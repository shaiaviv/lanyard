'use client';
import { useState, useTransition } from 'react';
import { MapPin, Users, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { upsertCoverage } from '@/app/actions/planning';
import type { Conference } from '@/lib/types';
import type { CoverageRow } from '@/lib/db/queries';

const VERTICALS = ['All', 'Fintech', 'Payments', 'Travel', 'SaaS', 'Banking'];
const TIERS: Array<'All' | 'T1' | 'T2' | 'T3'> = ['All', 'T1', 'T2', 'T3'];

const TIER_COLORS: Record<string, string> = {
  T1: 'bg-orange-100 text-orange-700 border-orange-200',
  T2: 'bg-blue-100 text-blue-700 border-blue-200',
  T3: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

const FACTOR_LABELS: Record<string, string> = {
  icpDensity: 'ICP Density',
  topicFit: 'Topic Fit',
  scale: 'Scale',
  geoRelevance: 'Geo Relevance',
  historicalPerf: 'Historical Performance',
};

const STATUS_OPTIONS = [
  { value: 'considering', label: 'Considering' },
  { value: 'committed', label: 'Committed ✓' },
  { value: 'declined', label: 'Declined' },
] as const;

interface Props {
  conferences: Conference[];
  coverage: CoverageRow[];
  repId: string;
}

function ScoreBar({ score, color = 'bg-orange-400' }: { score: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-zinc-500 w-7 text-right">{score}</span>
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

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
          isCommitted
            ? 'bg-green-50 border-green-300 text-green-700'
            : status
            ? 'bg-zinc-50 border-zinc-300 text-zinc-600'
            : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'
        }`}
      >
        {isCommitted && <Check size={11} />}
        {label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 min-w-[140px]">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => select(o.value)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors ${
                status === o.value ? 'text-orange-600 font-semibold' : 'text-zinc-700'
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
    <div className={`border rounded-xl overflow-hidden transition-colors ${isPast ? 'border-zinc-100 bg-zinc-50/50' : 'border-zinc-200 bg-white'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isActive && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                </span>
              )}
              {conf.tier && (
                <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 ${TIER_COLORS[conf.tier] ?? TIER_COLORS.T3}`}>
                  {conf.tier}
                </span>
              )}
              <h3 className={`text-sm font-semibold ${isPast ? 'text-zinc-400' : 'text-zinc-900'}`}>
                {conf.name}
              </h3>
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
              {start && end && <span>{start} – {end}</span>}
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

            {/* ICP score bar */}
            {conf.icpScore != null && (
              <div className="mt-2.5">
                <ScoreBar score={conf.icpScore} color={conf.icpScore >= 70 ? 'bg-orange-400' : conf.icpScore >= 50 ? 'bg-amber-400' : 'bg-zinc-300'} />
              </div>
            )}

            {/* Vertical tags */}
            {conf.verticals.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {conf.verticals.map((v) => (
                  <span key={v} className="text-[10px] bg-zinc-100 text-zinc-500 rounded px-1.5 py-0.5">
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>

          <CoverageButton conference={conf} currentStatus={myStatus} repId={repId} />
        </div>

        {/* Score breakdown toggle */}
        {conf.scoreBreakdown && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 mt-3 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            AI scoring breakdown
          </button>
        )}
      </div>

      {expanded && conf.scoreBreakdown && (
        <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50 space-y-2.5">
          {Object.entries(conf.scoreBreakdown.factors)
            .filter(([, v]) => v !== null)
            .map(([key, factor]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-600">
                    {FACTOR_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase())}
                  </span>
                </div>
                <ScoreBar
                  score={(factor as { score: number }).score}
                  color={(factor as { score: number }).score >= 70 ? 'bg-orange-400' : (factor as { score: number }).score >= 50 ? 'bg-amber-400' : 'bg-zinc-300'}
                />
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  {(factor as { rationale: string }).rationale}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
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

  const t1Count = conferences.filter((c) => c.tier === 'T1').length;
  const uncommittedT1 = conferences.filter(
    (c) => c.tier === 'T1' && !myStatusMap[c.id] && (!c.endDate || c.endDate >= today),
  );

  return (
    <div className="space-y-5">
      {/* Under-invested banner */}
      {uncommittedT1.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-amber-900">
            {uncommittedT1.length} T1 conference{uncommittedT1.length !== 1 ? 's' : ''} without coverage
          </p>
          <p className="text-xs text-amber-700">
            {uncommittedT1.slice(0, 2).map((c) => c.name).join(', ')}
            {uncommittedT1.length > 2 ? ` +${uncommittedT1.length - 2} more` : ''}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                tier === t
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {t === 'All' ? `All (${conferences.length})` : `${t} · ${conferences.filter((c) => c.tier === t).length}`}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {VERTICALS.map((v) => (
            <button
              key={v}
              onClick={() => setVertical(v)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                vertical === v
                  ? 'bg-zinc-800 text-white border-zinc-800'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'T1 targets', value: t1Count },
          { label: 'Committed', value: Object.values(myStatusMap).filter((s) => s === 'committed').length },
          { label: 'Considering', value: Object.values(myStatusMap).filter((s) => s === 'considering').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-zinc-900">{value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Conference list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400 font-medium">
            {filtered.length} conference{filtered.length !== 1 ? 's' : ''} · sorted by ICP score
          </p>
          <button
            onClick={() => setShowPast(!showPast)}
            className="text-xs text-zinc-400 hover:text-zinc-600 underline"
          >
            {showPast ? 'Hide past' : 'Show past'}
          </button>
        </div>

        {filtered.map((conf) => (
          <ConferenceCard
            key={conf.id}
            conf={conf}
            myStatus={myStatusMap[conf.id]}
            repId={repId}
          />
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-zinc-400">
            No conferences match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
