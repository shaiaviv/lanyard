'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Settings, Mic } from 'lucide-react';
import { ConferencePicker } from '@/components/field/ConferencePicker';
import { RecordButton } from '@/components/field/RecordButton';
import { CaptureForm } from '@/components/field/CaptureForm';
import { ReviewDraft } from '@/components/field/ReviewDraft';
import { processVoiceCapture } from '@/app/actions/voice';
import type { CaptureDraft } from '@/lib/types';
import type { Conference } from '@/lib/types';

type Stage = 'idle' | 'processing' | 'review';

interface Props {
  repId: string;
  conferenceId: string | null;
  conferences: Conference[];
  activeConferenceId: string | null;
}

export function CaptureScreen({ repId, conferenceId, conferences, activeConferenceId }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');
    setVoiceError(null);
    const result = await processVoiceCapture(base64);
    if ('error' in result) {
      setVoiceError(result.error);
      setStage('idle');
    } else {
      setDraft(result);
      setStage('review');
    }
  }, []);

  if (stage === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
            <Mic size={30} className="text-orange-500" />
          </div>
          <span className="absolute inset-0 rounded-full border-4 border-orange-300 animate-ping opacity-50" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-zinc-800">Analyzing your note…</p>
          <p className="text-xs text-zinc-400">Parsing · Checking for repeat contacts</p>
        </div>
      </div>
    );
  }

  if (stage === 'review' && draft) {
    return (
      <ReviewDraft
        draft={draft}
        conferenceId={conferenceId}
        repId={repId}
        onRetry={() => { setStage('idle'); setDraft(null); }}
      />
    );
  }

  // idle — the main capture screen
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-zinc-100">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold text-zinc-900">🪪 Lanyard</h1>
          <ConferencePicker conferences={conferences} activeId={activeConferenceId} />
        </div>
        <Link href="/settings" className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors">
          <Settings size={18} />
        </Link>
      </header>

      <div className="flex-1 px-4 py-6 space-y-8">
        <div className="flex justify-center">
          <RecordButton onCapture={handleCapture} />
        </div>

        {voiceError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">Voice capture failed</p>
            <p className="text-xs mt-0.5">{voiceError}</p>
            <p className="text-xs mt-1 text-red-500">
              Add your Anthropic key in{' '}
              <Link href="/settings" className="underline">Settings</Link>, or use the manual form below.
            </p>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-zinc-400 uppercase tracking-wide">
              or enter manually
            </span>
          </div>
        </div>

        <CaptureForm conferenceId={conferenceId} repId={repId} />
      </div>
    </div>
  );
}
