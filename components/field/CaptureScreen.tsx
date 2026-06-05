'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Fingerprint, Settings, MapPin, X, Mic, PencilLine, ChevronLeft } from 'lucide-react';

const PROCESSING_STEPS = [
  'Transcribing your recording…',
  'Analyzing the encounter…',
  'Extracting key details…',
  'Scoring ICP fit…',
  'Checking for repeat contacts…',
  'Cross-referencing your history…',
  'Identifying pain points…',
  'Flagging follow-up signals…',
  'Drafting your summary…',
  'Almost there…',
];

function ProcessingScreen() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % PROCESSING_STEPS.length);
        setVisible(true);
      }, 300);
    }, 2200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-8 px-8">
      {/* Animated orb */}
      <div className="relative flex items-center justify-center w-28 h-28">
        <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(244,168,37,0.08)', animationDuration: '2s' }} />
        <div className="absolute inset-[-12px] rounded-full animate-ping" style={{ background: 'rgba(244,168,37,0.04)', animationDuration: '2.6s', animationDelay: '0.4s' }} />
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 35% 35%, rgba(244,168,37,0.18), rgba(244,168,37,0.04))',
            border: '1px solid rgba(244,168,37,0.2)',
            boxShadow: '0 0 40px rgba(244,168,37,0.12)',
          }}
        >
          <Mic size={36} className="text-accent" strokeWidth={1.25} />
        </div>
      </div>

      {/* Rotating step text */}
      <div className="text-center min-h-[52px] flex flex-col items-center justify-center">
        <p
          className="text-base font-semibold text-text1 transition-all duration-300"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(6px)' }}
        >
          {PROCESSING_STEPS[idx]}
        </p>
        <p className="text-xs text-text3 mt-1.5">Powered by Claude + Whisper</p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {PROCESSING_STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 16 : 4,
              height: 4,
              background: i === idx ? 'rgba(244,168,37,0.8)' : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
import { ConferenceGate } from '@/components/field/ConferenceGate';
import { RecordButton } from '@/components/field/RecordButton';
import { CaptureForm } from '@/components/field/CaptureForm';
import { ReviewDraft } from '@/components/field/ReviewDraft';
import { transcribeAndProcess } from '@/app/actions/voice';
import { setCurrentConference } from '@/app/actions/conference';
import type { CaptureDraft, Conference } from '@/lib/types';

type Stage = 'idle' | 'manual' | 'processing' | 'review';

interface Props {
  repId: string;
  conferenceId: string | null;
  conferences: Conference[];
  activeConferenceId: string | null;
}

const DRAFT_KEY = 'lanyard:pending_draft';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type StoredDraft = { repId: string; draft: CaptureDraft; savedAt: number };

function saveDraft(repId: string, draft: CaptureDraft) {
  try {
    const entry: StoredDraft = { repId, draft, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(entry));
  } catch { /* ignore quota errors */ }
}

function loadDraft(repId: string): CaptureDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const entry: StoredDraft = JSON.parse(raw);
    if (entry.repId !== repId || Date.now() - entry.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return entry.draft;
  } catch { return null; }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

export function CaptureScreen({ repId, conferenceId, conferences, activeConferenceId }: Props) {
  const [localConferenceId, setLocalConferenceId] = useState<string | null>(
    conferenceId ?? activeConferenceId ?? null,
  );
  const [stage, setStage] = useState<Stage>('idle');
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Restore rep-scoped draft on mount; rejects stale or foreign-rep entries
  useEffect(() => {
    const saved = loadDraft(repId);
    if (saved) { setDraft(saved); setStage('review'); }
  }, [repId]);

  const selectedConference = conferences.find((c) => c.id === localConferenceId);

  const handleAudioReady = useCallback(async (blob: Blob) => {
    setStage('processing');
    setVoiceError(null);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      const result = await transcribeAndProcess(formData);
      if ('error' in result) {
        setVoiceError(result.error);
        setStage('idle');
      } else {
        saveDraft(repId, result);
        setDraft(result);
        setStage('review');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong — please try again.';
      setVoiceError(msg);
      setStage('idle');
    }
  }, [repId]);

  /* ── Conference gate ── */
  if (!localConferenceId) {
    return (
      <ConferenceGate
        conferences={conferences}
        onSelect={(id) => {
          setLocalConferenceId(id);
          setStage('idle');
          setCurrentConference(id);
        }}
      />
    );
  }

  /* ── AI processing ── */
  if (stage === 'processing') {
    return <ProcessingScreen />;
  }

  /* ── Review AI draft ── */
  if (stage === 'review' && draft) {
    return (
      <ReviewDraft
        draft={draft}
        conferenceId={localConferenceId}
        repId={repId}
        onRetry={() => { clearDraft(); setStage('idle'); setDraft(null); }}
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
          <p className="text-xs font-medium text-text3 mb-5">
            {selectedConference?.name ?? 'Manual capture'}
          </p>
          <CaptureForm conferenceId={localConferenceId} repId={repId} />
        </div>
      </div>
    );
  }

  /* ── Record screen (idle) ── */
  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-10 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Fingerprint size={17} className="text-accent" strokeWidth={1.5} />
          <span className="text-[13px] font-semibold text-text2">Lanyard</span>
        </div>
        <Link
          href="/settings"
          className="p-2 rounded-xl hover:bg-elevated text-text3 hover:text-text2 transition-colors"
        >
          <Settings size={17} />
        </Link>
      </header>

      {/* Conference pill */}
      <div className="px-5 shrink-0">
        <button
          onClick={() => { setLocalConferenceId(null); setVoiceError(null); setCurrentConference(null); }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-text1 hover:text-white transition-all bg-white/5 border border-white/9 hover:bg-white/8"
        >
          <MapPin size={12} className="text-accent flex-shrink-0" />
          <span className="truncate max-w-[240px]">
            {selectedConference?.name ?? 'Unknown conference'}
          </span>
          <X size={12} className="text-text3 flex-shrink-0 ml-auto" />
        </button>
      </div>

      {/* Record hero — fills remaining space */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-4 min-h-0">
        {/* Record button centered */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 pt-8">
          <div className="animate-scale-in">
            <RecordButton onAudioReady={handleAudioReady} />
          </div>

          <div className="text-center animate-fade-up delay-150 max-w-[300px]">
            <p className="text-sm font-semibold text-text1 mb-1">Record an Encounter</p>
            <p className="text-xs text-text2 leading-relaxed">
              The more detail, the better. Make sure to include their{' '}
              <span className="text-text1 font-medium">name, company, and title</span>, what you discussed,
              their pain points, interest level, and any agreed next steps.
            </p>
            <p className="text-xs text-text2 leading-relaxed mt-2">
              Don&apos;t be afraid to tell a tale. Our AI will take care of parsing and summarizing all the important points and extract what&apos;s important.
            </p>
          </div>

          {voiceError && (
            <div className="w-full rounded-xl px-4 py-3 animate-fade-up bg-error/7 border border-error/14">
              <p className="text-sm font-semibold text-red-400">Voice capture failed</p>
              <p className="text-xs mt-1 text-red-400/60">
                {voiceError} · Add your Anthropic key in{' '}
                <Link href="/settings" className="underline text-red-400/75">Settings</Link>.
              </p>
            </div>
          )}
        </div>

        {/* Fill manually — anchored to bottom */}
        <div className="w-full pb-2 shrink-0 animate-fade-up delay-300">
          <button
            onClick={() => setStage('manual')}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-text3 hover:text-text2 transition-colors rounded-xl hover:bg-elevated"
          >
            <PencilLine size={14} strokeWidth={1.75} />
            Fill in manually instead
          </button>
        </div>
      </div>
    </div>
  );
}
