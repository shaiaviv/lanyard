'use client';
import { useState } from 'react';
import { ConferenceList } from '@/components/planning/ConferenceList';
import { CoverageTimeline } from '@/components/planning/CoverageTimeline';
import { FollowUpQueue } from '@/components/planning/FollowUpQueue';
import type { Conference } from '@/lib/types';
import type { CoverageRow, FollowUpRow } from '@/lib/db/queries';

const TABS = ['Conferences', 'Coverage', 'Follow-ups'] as const;
type Tab = (typeof TABS)[number];

interface Props {
  conferences: Conference[];
  coverage: CoverageRow[];
  followUps: FollowUpRow[];
  repId: string;
  repName: string;
}

export function PlanningHub({ conferences, coverage, followUps, repId, repName }: Props) {
  const [tab, setTab] = useState<Tab>('Conferences');

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="px-6 pt-10 pb-0 border-b border-zinc-100">
        <h1 className="text-2xl font-bold text-zinc-900 mb-0.5">Conference Hub</h1>
        <p className="text-sm text-zinc-500 mb-4">
          {conferences.length} conferences · {conferences.filter((c) => c.tier === 'T1').length} T1 targets
        </p>

        {/* Tab bar */}
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t}
              {t === 'Follow-ups' && followUps.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                  {followUps.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-6 py-6">
        {tab === 'Conferences' && (
          <ConferenceList
            conferences={conferences}
            coverage={coverage}
            repId={repId}
          />
        )}
        {tab === 'Coverage' && (
          <CoverageTimeline
            conferences={conferences}
            coverage={coverage}
            repId={repId}
            repName={repName}
          />
        )}
        {tab === 'Follow-ups' && (
          <FollowUpQueue followUps={followUps} />
        )}
      </div>
    </div>
  );
}
