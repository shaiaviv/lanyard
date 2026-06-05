'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Fingerprint, Settings, MapPin, X, Mic, PencilLine, ChevronLeft } from 'lucide-react';
import { ConferenceGate } from '@/components/field/ConferenceGate';
import { RecordButton } from '@/components/field/RecordButton';
import { CaptureForm } from '@/components/field/CaptureForm';
import { ReviewDraft } from '@/components/field/ReviewDraft';
import { processVoiceCapture } from '@/app/actions/voice';
import type { CaptureDraft, Conference } from '@/lib/types';

type Stage = 'idle' | 'manual' | 'processing' | 'review';

interface Props {
  repId: string;
  conferenceId: string | null;
  conferences: Conference[];
  activeConferenceId: string | null;
}

export function CaptureScreen({ repId, conferenceId, conferences, activeConferenceId }: Props) {
  const [localConferenceId, setLocalConferenceId] = useState<string | null>(
    conferenceId ?? activeConferenceId ?? null,
  );
  const [stage, setStage] = useState<Stage>('idle');
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const selectedConference = conferences.find((c) => c.id === localConferenceId);

  const handleCapture = useCallback(async (transcript: string) => {
    setStage('processing');
    setVoiceError(null);
    const result = await processVoiceCapture(transcript);
    if ('error' in result) {
      setVoiceError(result.error);
      setStage('idle');
    } else {
      setDraft(result);
      setStage('review');
    }
  }, []);

  /* ── Conference gate ── */
  if (!localConferenceId) {
    return (
      <ConferenceGate
        conferences={conferences}
        onSelect={(id) => { setLocalConferenceId(id); setStage('idle'); }}
      />
    );
  }

  /* ── AI processing ── */
  if (stage === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-6">
        <div className="relative w-20 h-20">
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(244,168,37,0.1)', animationDuration: '1.5s' }}
          />
          <div
            className="w-20 h-20 rounded-full bg-elevated flex items-center justify-center"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Mic size={28} className="text-accent" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-text1">Parsing your note…</p>
          <p className="text-xs text-text2">Checking for repeat contacts</p>
        </div>
      </div>
    );
  }

  /* ── Review AI draft ── */
  if (stage === 'review' && draft) {
    return (
      <ReviewDraft
        draft={draft}
        conferenceId={localConferenceId}
        repId={repId}
        onRetry={() => { setStage('idle'); setDraft(null); }}
      />
    );
  }

  /* ── Manual form ── */
  if (stage === 'manual') {
    return (
      <div className="flex flex-col min-h-full">
        <header className="flex items-center justify-between px-5 pt-12 pb-5">
          <button
            onClick={() => setStage('idle')}
            className="flex items-center gap-1.5 text-text3 hover:text-text1 transition-colors"
          >
            <ChevronLeft size={17} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <Link
            href="/settings"
            className="p-2 rounded-xl hover:bg-elevated text-text3 hover:text-text2 transition-colors"
          >
            <Settings size={17} />
          </Link>
        </header>
        <div className="px-5 pb-10">
          <p className="text-[10px] font-bold text-text3 uppercase tracking-widest mb-5">
            {selectedConference?.name ?? 'Manual capture'}
          </p>
          <CaptureForm conferenceId={localConferenceId} repId={repId} />
        </div>
      </div>
    );
  }

  /* ── Record screen (idle) ── */
  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-12 pb-5">
        <div className="flex items-center gap-2">
          <Fingerprint size={18} className="text-accent" strokeWidth={1.5} />
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-text2">
            Lanyard
          </span>
        </div>
        <Link
          href="/settings"
          className="p-2 rounded-xl hover:bg-elevated text-text3 hover:text-text2 transition-colors"
        >
          <Settings size={17} />
        </Link>
      </header>

      {/* Conference pill */}
      <div className="px-5 pb-5">
        <button
          onClick={() => { setLocalConferenceId(null); setVoiceError(null); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-text2 hover:text-text1 transition-colors"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          <MapPin size={11} className="text-accent flex-shrink-0" />
          <span className="truncate max-w-[220px]">
            {selectedConference?.name ?? 'Unknown conference'}
          </span>
          <X size={11} className="text-text3 flex-shrink-0 ml-0.5" />
        </button>
      </div>

      {/* Hero — record button + instructions */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 pb-4">
        <RecordButton onCapture={handleCapture} />

        <div className="text-center max-w-[260px] space-y-3">
          <p className="text-sm text-text2 leading-relaxed">
            Say their name, company and role, how you met, what you discussed, and how interested they seemed.
          </p>
          <div
            className="inline-flex items-center gap-2 text-xs text-text3 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="font-mono text-accent text-[10px]">e.g.</span>
            <span className="italic leading-snug text-left">
              "Met Sarah from Stripe, Head of Payments — interested in FX hedging, very warm."
            </span>
          </div>
        </div>

        {voiceError && (
          <div
            className="w-full rounded-xl px-4 py-3"
            style={{
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.14)',
            }}
          >
            <p className="text-sm font-semibold text-red-400">Voice capture failed</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(239,68,68,0.6)' }}>
              {voiceError} · Add your Anthropic key in{' '}
              <Link href="/settings" className="underline" style={{ color: 'rgba(239,68,68,0.75)' }}>
                Settings
              </Link>
              , or fill in manually below.
            </p>
          </div>
        )}
      </div>

      {/* Manual entry fallback */}
      <div className="px-5 pb-8">
        <button
          onClick={() => setStage('manual')}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-text3 hover:text-text2 transition-colors rounded-xl hover:bg-elevated"
        >
          <PencilLine size={14} strokeWidth={1.75} />
          Fill in manually instead
        </button>
      </div>
    </div>
  );
}
