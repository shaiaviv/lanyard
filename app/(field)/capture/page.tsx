import { Suspense } from 'react';
import { getCurrentRep, getActiveConference, getConferences } from '@/lib/db/queries';
import { CaptureScreen } from '@/components/field/CaptureScreen';

interface Props {
  searchParams: Promise<{ conf?: string }>;
}

export default async function CapturePage({ searchParams }: Props) {
  const params = await searchParams;

  const [rep, activeConference, conferences] = await Promise.all([
    getCurrentRep(),
    getActiveConference(),
    getConferences(),
  ]);

  const selectedId = params.conf ?? rep?.currentConferenceId ?? activeConference?.id ?? null;

  if (!rep) {
    return (
      <div className="flex items-center justify-center py-20 px-6 text-center">
        <p className="text-sm text-text3">
          Rep profile not found.{' '}
          <code
            className="font-mono text-xs rounded px-1"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#EEF2FF' }}
          >
            supabase/setup.sql
          </code>{' '}
          seeds the required row.
        </p>
      </div>
    );
  }

  return (
    <Suspense>
      <CaptureScreen
        repId={rep.id}
        conferenceId={selectedId}
        conferences={conferences}
        activeConferenceId={activeConference?.id ?? null}
      />
    </Suspense>
  );
}
