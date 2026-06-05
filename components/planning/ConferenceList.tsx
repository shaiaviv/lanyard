'use client';
import { useState, useTransition } from 'react';
import { MapPin, Users, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { upsertCoverage } from '@/app/actions/planning';
import type { Conference } from '@/lib/types';
import type { CoverageRow } from '@/lib/db/queries';

const VERTICALS = ['All', 'Fintech', 'Payments', 'Travel', 'SaaS', 'Banking'];
const TIERS: Array<'All' | 'T1' | 'T2' | 'T3'> = ['All', 'T1', 'T2', 'T3'];

/* Tier visual system */
const TIER_LEFT_BORDER: Record<string, string> = {
  T1: 'bg-amber-400',
  T2: 'bg-blue-400',
  T3: 'bg-[rgba(255,255,255,0.12)]',
};

const TIER_BADGE: Record<string, { bg: string; text: string }> = {
  T1: { bg: 'rgba(244,168,37,0.1)', text: 'text-amber-400' },
  T2: { bg: 'rgba(96,165,250,0.1)', text: 'text-blue-400' },
  T3: { bg: 'rgba(255,255,255,0.05)', text: 'text-text3' },
};

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
  const barWidth = `${score}%`;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full score-bar-fill" style={{ width: barWidth }} />
      </div>
      <span className="text-xs font-mono text-text3 w-6 text-right tabular-nums">{score}</span>
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

  let btnStyle: React.CSSProperties;
  let btnClass: string;
  if (isCommitted) {
    btnStyle = { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' };
    btnClass = 'text-success';
  } else if (status) {
    btnStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' };
    btnClass = 'text-text2';
  } else {
    btnStyle = { background: 'rgba(244,168,37,0.06)', border: '1px solid rgba(244,168,37,0.14)' };
    btnClass = 'text-accent';
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        style={btnStyle}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-40 ${btnClass}`}
      >
        {isCommitted && <Check size={11} />}
        {label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-10 bg-card rounded-xl py-1 min-w-[140px]"
          style={{ border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        >
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

  const tierBorderColor = TIER_LEFT_BORDER[conf.tier ?? 'T3'];
  const tierBadge = TIER_BADGE[conf.tier ?? 'T3'];

  return (
    <div
      className={`relative rounded-2xl overflow-hidden transition-all ${
        isPast ? 'opacity-50' : 'hover:translate-y-[-1px]'
      }`}
      style={{
        background: '#161E2E',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Tier color left stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${tierBorderColor}`} />

      <div className="pl-5 pr-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Name + tier + live badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {isActive && (
                <span
                  className="flex items-center gap-1 text-[9px] font-bold text-success uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
                </span>
              )}
              {conf.tier && (
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tierBadge.text}`}
                  style={{ background: tierBadge.bg }}
                >
                  {conf.tier}
                </span>
              )}
              <h3 className="text-sm font-semibold text-text1">{conf.name}</h3>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-text3 flex-wrap">
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
                <ScoreBar score={conf.icpScore} />
              </div>
            )}

            {/* Vertical tags */}
            {conf.verticals.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {conf.verticals.map((v) => (
                  <span
                    key={v}
                    className="text-[9px] text-text3 rounded px-1.5 py-0.5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
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
            className="flex items-center gap-1 text-xs text-text3 hover:text-text2 mt-3 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            AI scoring breakdown
          </button>
        )}
      </div>

      {expanded && conf.scoreBreakdown && (
        <div
          className="px-5 py-3 space-y-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
        >
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
                  <p className="text-[11px] text-text3 mt-0.5 leading-snug">{f.rationale}</p>
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

  const t1Count = conferences.filter((c) => c.tier === 'T1').length;
  const uncommittedT1 = conferences.filter(
    (c) => c.tier === 'T1' && !myStatusMap[c.id] && (!c.endDate || c.endDate >= today),
  );

  return (
    <div className="space-y-5">
      {/* Under-invested banner */}
      {uncommittedT1.length > 0 && (
        <div
          className="rounded-xl px-4 py-3 space-y-1"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.14)' }}
        >
          <p className="text-sm font-semibold text-warn">
            {uncommittedT1.length} T1 conference{uncommittedT1.length !== 1 ? 's' : ''} without coverage
          </p>
          <p className="text-xs" style={{ color: 'rgba(245,158,11,0.6)' }}>
            {uncommittedT1.slice(0, 2).map((c) => c.name).join(', ')}
            {uncommittedT1.length > 2 ? ` +${uncommittedT1.length - 2} more` : ''}
          </p>
        </div>
      )}

      {/* Tier filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                tier === t
                  ? 'bg-accent text-[#07090F]'
                  : 'text-text2 hover:text-text1'
              }`}
              style={
                tier !== t
                  ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                  : { boxShadow: '0 2px 8px rgba(244,168,37,0.2)' }
              }
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
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                vertical === v ? 'bg-elevated text-text1' : 'text-text3 hover:text-text2'
              }`}
              style={
                vertical === v
                  ? { border: '1px solid rgba(255,255,255,0.12)' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }
              }
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
          <div
            key={label}
            className="bg-elevated rounded-xl p-3 text-center"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xl font-bold text-text1 tabular-nums">{value}</p>
            <p className="text-[10px] text-text3 mt-0.5 font-medium uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Conference list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-text3 font-bold uppercase tracking-widest">
            {filtered.length} conference{filtered.length !== 1 ? 's' : ''} · by ICP score
          </p>
          <button
            onClick={() => setShowPast(!showPast)}
            className="text-[10px] text-text3 hover:text-text2 font-semibold uppercase tracking-wider underline transition-colors"
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
          <div className="text-center py-12 text-sm text-text3">
            No conferences match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
