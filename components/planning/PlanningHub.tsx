'use client';
import { useState } from 'react';
import { Fingerprint } from 'lucide-react';
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

  const t1Count = conferences.filter((c) => c.tier === 'T1').length;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 pt-10 pb-0 border-b border-[rgba(255,255,255,0.06)]">
        {/* Wordmark row */}
        <div className="flex items-center gap-2.5 mb-1">
          <Fingerprint size={20} className="text-accent" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-text1 uppercase">
            Conference Hub
          </h1>
        </div>
        <p className="text-xs text-text3 mb-5 font-medium">
          {conferences.length} conferences · {t1Count} T1 must-attend targets
        </p>

        {/* Tab bar */}
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text3 hover:text-text2'
              }`}
            >
              {t}
              {t === 'Follow-ups' && followUps.length > 0 && (
                <span
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-accent text-[9px] font-bold"
                  style={{ background: 'rgba(244,168,37,0.1)', border: '1px solid rgba(244,168,37,0.2)' }}
                >
                  {followUps.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-6 py-6">
        {tab === 'Conferences' && (
          <ConferenceList conferences={conferences} coverage={coverage} repId={repId} />
        )}
        {tab === 'Coverage' && (
          <CoverageTimeline
            conferences={conferences}
            coverage={coverage}
            repId={repId}
            repName={repName}
          />
        )}
        {tab === 'Follow-ups' && <FollowUpQueue followUps={followUps} />}
      </div>
    </div>
  );
}
