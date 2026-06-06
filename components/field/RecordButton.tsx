'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, MicOff } from 'lucide-react';

interface RecordButtonProps {
  onAudioReady: (blob: Blob) => void;
  disabled?: boolean;
}

type RecordState = 'idle' | 'preparing' | 'recording';

export function RecordButton({ onAudioReady, disabled }: RecordButtonProps) {
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [unsupported, setUnsupported] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
      setUnsupported(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (recordState !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // onstart fires when codec is initialised — wait 500ms more for hardware warmup
      recorder.onstart = () => {
        setTimeout(() => {
          setElapsed(0);
          timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
          setRecordState('recording');
        }, 500);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setElapsed(0);
        setRecordState('idle');
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size > 0) onAudioReady(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecordState('preparing');
    } catch {
      setUnsupported(true);
    }
  }, [recordState, onAudioReady]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }, []);

  if (unsupported) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div
          className="w-44 h-44 rounded-full bg-elevated flex items-center justify-center"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <MicOff size={44} strokeWidth={1.25} className="text-text3" />
        </div>
        <p className="text-sm text-text2 max-w-[220px] leading-relaxed">
          Voice capture requires Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  const isPreparing = recordState === 'preparing';
  const isRecording = recordState === 'recording';
  const buttonBusy = disabled || isPreparing;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex items-center justify-center w-60 h-60">
        {!isRecording && !isPreparing && (
          <>
            <div className="absolute inset-[-10px] rounded-full bg-accent/[0.05]" />
            <div className="absolute inset-[-28px] rounded-full bg-accent/[0.025]" />
            <div className="absolute inset-[-46px] rounded-full bg-accent/[0.01]" />
          </>
        )}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-red-500/40 ring-out" style={{ transformOrigin: 'center' }} />
            <div className="absolute inset-0 rounded-full border border-red-500/20 ring-out delay-200" style={{ transformOrigin: 'center' }} />
          </>
        )}

        <button
          type="button"
          disabled={buttonBusy}
          onClick={isRecording ? stopRecording : startRecording}
          className={`relative w-44 h-44 rounded-full flex items-center justify-center transition-transform duration-150 active:scale-95 hover:scale-[1.03] disabled:opacity-40 disabled:cursor-not-allowed ${
            isRecording ? 'record-active' : 'record-idle'
          }`}
          title={isPreparing ? 'Get ready…' : isRecording ? 'Tap to stop' : 'Tap to start voice capture'}
        >
          {isRecording ? (
            <Square size={38} strokeWidth={1.5} fill="white" className="text-white" />
          ) : (
            <Mic size={52} strokeWidth={1.25} className="text-[#07090F]" />
          )}
        </button>
      </div>

      {isPreparing ? (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-sm font-semibold text-yellow-400 tracking-wide">Get ready…</span>
        </div>
      ) : isRecording ? (
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-sm font-semibold text-red-400 tracking-wide">
              Recording · {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
            </span>
          </div>
          <p className="text-xs text-text3 text-center">Speak freely · tap stop when done</p>
        </div>
      ) : null}
    </div>
  );
}
