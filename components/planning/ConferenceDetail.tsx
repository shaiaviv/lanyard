'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Users, Calendar, Loader2, Check, Send, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  assignCoverage,
  overrideConferenceFactor,
  rescoreConference,
  bulkPushQualified,
  type CoverageStatus,
} from '@/app/actions/planning';
import { computeIcpScore, WEIGHT_FACTORS, type ScoringWeights, type Tier } from '@/lib/scoring/computeIcpScore';
import type { Conference, Rep, ConferenceScoreBreakdown } from '@/lib/types';
import type { CoverageRow, ConferenceLead } from '@/lib/db/queries';

const STATUS: { value: CoverageStatus; label: string; chip: string }[] = [
  { value: 'considering', label: 'Considering', chip: 'text-blue-300 bg-blue-400/10 border-blue-400/20' },
  { value: 'committed',   label: 'Committed',   chip: 'text-success bg-success/10 border-success/20' },
  { value: 'declined',    label: 'Declined',    chip: 'text-text3 bg-white/5 border-white/10' },
];

const VERDICT_MARK: Record<string, string> = { warming: '↑', nurturing: '◎', cooling: '↓', tirekicker: '—', tooearly: '○' };

export function ConferenceDetail({
  conference,
  coverage,
  reps,
  leads,
  otherEditions,
  weights,
  currentRepId,
}: {
  conference: Conference;
  coverage: CoverageRow[];
  reps: Rep[];
  leads: ConferenceLead[];
  otherEditions: { id: string; name: string; startDate: string | null; icpScore: number | null; tier: string | null }[];
  weights: ScoringWeights;
  currentRepId: string;
}) {
  const [breakdown, setBreakdown] = useState<ConferenceScoreBreakdown | null>(conference.scoreBreakdown);
  const [coverageState, setCoverageState] = useState<CoverageRow[]>(coverage);
  const [isRescoring, startRescore] = useTransition();
  const [bulk, setBulk] = useState<{ pushed: number; failed: number; mock: boolean; total: number } | null>(null);
  const [isBulk, startBulk] = useTransition();

  const live = breakdown ? computeIcpScore(breakdown, weights) : { score: conference.icpScore ?? 0, tier: (conference.tier as Tier) ?? 'T3' };

  const start = conference.startDate ? new Date(conference.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const end = conference.endDate ? new Date(conference.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  const statusByRep = new Map(coverageState.map((c) => [c.repId, c.status]));

  function setStatus(repId: string, status: CoverageStatus) {
    setCoverageState((prev) => {
      const idx = prev.findIndex((c) => c.repId === repId);
      const repName = reps.find((r) => r.id === repId)?.name ?? 'Unknown';
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], status }; return next; }
      return [...prev, { id: `${repId}-${conference.id}`, repId, repName, conferenceId: conference.id, status }];
    });
    void assignCoverage(repId, conference.id, status);
  }

  function override(key: 'icpDensity' | 'topicFit' | 'scale' | 'geoRelevance' | 'historicalPerf', value: number) {
    setBreakdown((prev) => {
      if (!prev) return prev;
      const cur = prev.factors[key];
      if (!cur) return prev;
      return { ...prev, factors: { ...prev.factors, [key]: { ...cur, score: value } } };
    });
    void overrideConferenceFactor(conference.id, key, value);
  }

  function rescore() {
    startRescore(async () => {
      const res = await rescoreConference(conference.id);
      if (!('error' in res)) {
        // pull fresh breakdown by reloading — simplest: navigate refresh
        window.location.reload();
      }
    });
  }

  function pushQualified() {
    startBulk(async () => setBulk(await bulkPushQualified(conference.id)));
  }

  return (
    <div className="flex flex-col">
      <header className="px-6 pt-6 pb-4 border-b border-white/6">
        <Link href="/planning" className="flex items-center gap-1 text-sm text-text3 mb-4 hover:text-text2 transition-colors">
          <ArrowLeft size={14} /> Conference Hub
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {live.tier && <Badge variant={live.tier as 'T1' | 'T2' | 'T3'}>{live.tier}</Badge>}
              <span className="text-sm font-bold text-accent tabular-nums">ICP {live.score}</span>
            </div>
            <h1 className="text-2xl font-bold text-text1">{conference.name}</h1>
            <div className="flex items-center gap-3 text-sm text-text3 flex-wrap mt-1.5">
              {start && <span className="flex items-center gap-1"><Calendar size={12} /> {start}{end && end !== start ? ` – ${end}` : ''}</span>}
              {conference.location && <span className="flex items-center gap-1"><MapPin size={12} /> {conference.location}{conference.country ? `, ${conference.country}` : ''}</span>}
              {conference.estAudience && <span className="flex items-center gap-1"><Users size={12} /> {conference.estAudience.toLocaleString()}</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">
        {/* Score breakdown + factor override */}
        {breakdown && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text2">ICP score breakdown</h2>
              <button onClick={rescore} disabled={isRescoring} className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 disabled:opacity-50">
                {isRescoring ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {isRescoring ? 'Re-scoring…' : 'Re-score with AI'}
              </button>
            </div>
            <p className="text-xs text-text3 mb-4 leading-relaxed">
              AI-estimated factors — adjust any score if you know better (the AI estimate is a guess). The total recomputes with the team weights.
            </p>
            <div className="space-y-4">
              {WEIGHT_FACTORS.map((f) => {
                const factor = breakdown.factors[f.key];
                if (!factor) return null;
                return (
                  <div key={f.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text2">{f.label}</span>
                      <span className="text-sm font-bold tabular-nums text-accent w-8 text-right">{factor.score}</span>
                    </div>
                    <input
                      type="range" min={0} max={100} step={1} value={factor.score}
                      onChange={(e) => override(f.key, Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer"
                      aria-label={`${f.label} score`}
                    />
                    <p className="text-[11px] text-text3 mt-1 leading-snug">{factor.rationale}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Assign reps */}
        <section>
          <h2 className="text-sm font-semibold text-text2 mb-3">Team coverage</h2>
          <div className="space-y-2">
            {reps.map((rep) => {
              const cur = statusByRep.get(rep.id) as CoverageStatus | undefined;
              return (
                <div key={rep.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/7 bg-card px-3.5 py-2.5">
                  <span className="text-sm text-text1 font-medium">
                    {rep.name}{rep.id === currentRepId && <span className="text-text3 font-normal"> (You)</span>}
                  </span>
                  <div className="flex gap-1">
                    {STATUS.map((s) => {
                      const active = cur === s.value;
                      return (
                        <button key={s.value} onClick={() => setStatus(rep.id, active ? 'declined' : s.value)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition-all ${active ? s.chip : 'text-text3 bg-white/3 border-white/6 hover:border-white/12'}`}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leads captured (repeat-history / ROI) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text2">
              Leads captured here <span className="text-text3 font-normal">({leads.length})</span>
            </h2>
            {leads.length > 0 && (
              bulk ? (
                <span className="flex items-center gap-1.5 text-xs text-success font-semibold">
                  <Check size={12} /> Pushed {bulk.pushed}/{bulk.total}{bulk.mock ? ' (demo)' : ''}
                </span>
              ) : (
                <button onClick={pushQualified} disabled={isBulk} className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/15 disabled:opacity-40">
                  {isBulk ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Push qualified to HubSpot
                </button>
              )
            )}
          </div>
          {leads.length === 0 ? (
            <p className="text-xs text-text3">No leads captured at this event yet.</p>
          ) : (
            <div className="space-y-2">
              {leads.map((l, i) => {
                const inner = (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/7 bg-card px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text1 truncate">
                        {l.verdict && <span className="text-text3 mr-1">{VERDICT_MARK[l.verdict] ?? ''}</span>}
                        {l.name}
                      </p>
                      {l.company && <p className="text-xs text-text3 truncate">{l.company} · met by {l.repName}</p>}
                    </div>
                    {l.temperature && <span className="text-xs text-text3 capitalize flex-shrink-0">{l.temperature}</span>}
                  </div>
                );
                return l.contactId ? <Link key={i} href={`/contact/${l.contactId}`} className="block hover:opacity-80 transition-opacity">{inner}</Link> : <div key={i}>{inner}</div>;
              })}
            </div>
          )}
        </section>

        {/* Other editions */}
        {otherEditions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text2 mb-3">Other editions</h2>
            <div className="flex flex-wrap gap-2">
              {otherEditions.map((e) => (
                <Link key={e.id} href={`/planning/conference/${e.id}`}
                  className="flex items-center gap-2 text-xs rounded-lg border border-white/8 bg-card px-3 py-2 hover:border-white/14 transition-colors">
                  <span className="text-text2 font-medium">{e.name}</span>
                  {e.tier && <Badge variant={e.tier as 'T1' | 'T2' | 'T3'}>{e.tier}</Badge>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
