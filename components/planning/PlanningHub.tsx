'use client';
import { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { OverviewTab } from '@/components/planning/OverviewTab';
import { ConferenceList } from '@/components/planning/ConferenceList';
import { CoverageView } from '@/components/planning/CoverageView';
import { FollowUpQueue } from '@/components/planning/FollowUpQueue';
import { RelationshipList } from '@/components/planning/RelationshipList';
import type { Conference, Rep } from '@/lib/types';
import type { CoverageRow, FollowUpRow, RelationshipRow, GapAnalysis } from '@/lib/db/queries';
import type { ScoringWeights } from '@/lib/scoring/computeIcpScore';

const TABS = ['Overview', 'Conferences', 'Coverage', 'Relationships', 'Follow-ups'] as const;
type Tab = (typeof TABS)[number];

interface Props {
  conferences: Conference[];
  coverage: CoverageRow[];
  followUps: FollowUpRow[];
  relationships: RelationshipRow[];
  gap: GapAnalysis;
  reps: Rep[];
  weights: ScoringWeights;
  repId: string;
  repName: string;
}

export function PlanningHub({ conferences, coverage, followUps, relationships, gap, reps, weights, repId, repName }: Props) {
  const [tab, setTab] = useState<Tab>('Overview');
  const warmingNoFollowUp = relationships.filter(
    (r) => (r.verdict === 'warming' || r.verdict === 'nurturing') && !r.hasFollowUp,
  ).length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Compact top bar: logo + nav tabs on one line */}
      <header className="border-b border-white/6 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          {/* Logo mark */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Fingerprint size={14} className="text-accent" strokeWidth={1.75} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-text3">Lanyard</span>
              <span className="text-white/20 text-xs">/</span>
              <span className="text-base font-bold text-text1">Conference Hub</span>
            </div>
          </div>

          {/* Conference count */}
          <span className="text-xs text-text3 hidden sm:block">
            {conferences.length} conferences
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text3 hover:text-text2'
              }`}
            >
              {t}
              {t === 'Follow-ups' && followUps.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold bg-accent/10 border border-accent/20 text-accent">
                  {followUps.length}
                </span>
              )}
              {t === 'Relationships' && warmingNoFollowUp > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold bg-green-500/15 border border-green-500/25 text-green-400">
                  {warmingNoFollowUp}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-6 py-6">
        {tab === 'Overview' && (
          <OverviewTab
            conferences={conferences}
            coverage={coverage}
            relationships={relationships}
            followUps={followUps}
            gap={gap}
            onNavigate={setTab}
          />
        )}
        {tab === 'Conferences' && (
          <ConferenceList
            conferences={conferences}
            coverage={coverage}
            reps={reps}
            repId={repId}
            weights={weights}
          />
        )}
        {tab === 'Coverage' && (
          <CoverageView
            conferences={conferences}
            coverage={coverage}
            gap={gap}
            repId={repId}
            repName={repName}
          />
        )}
        {tab === 'Relationships' && <RelationshipList rows={relationships} />}
        {tab === 'Follow-ups' && <FollowUpQueue followUps={followUps} repId={repId} />}
      </div>
    </div>
  );
}
