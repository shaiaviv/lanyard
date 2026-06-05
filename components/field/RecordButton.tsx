'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, MicOff, Loader2 } from 'lucide-react';

interface RecordButtonProps {
  onCapture: (transcript: string) => void;
  disabled?: boolean;
}

type RecordState = 'idle' | 'recording' | 'transcribing';

// Module-level singleton — loaded once, cached in memory and browser cache thereafter
let whisperPromise: Promise<(audio: Float32Array) => Promise<{ text: string }>> | null = null;

function getWhisper() {
  if (!whisperPromise) {
    whisperPromise = import('@huggingface/transformers').then(({ pipeline }) =>
      pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
        dtype: 'q8',
      }) as Promise<(audio: Float32Array) => Promise<{ text: string }>>
    );
  }
  return whisperPromise;
}

async function blobToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  // AudioContext resamples to 16kHz — what Whisper expects
  const ctx = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  ctx.close();
  return audioBuffer.getChannelData(0);
}

export function RecordButton({ onCapture, disabled }: RecordButtonProps) {
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Pre-warm model as soon as component mounts — so it's ready by the time user hits record
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia) { setUnsupported(true); return; }

    setModelLoading(true);
    getWhisper()
      .then(() => { setModelReady(true); setModelLoading(false); })
      .catch(() => { setModelLoading(false); });
  }, []);

  const startRecording = useCallback(async () => {
    if (recordState !== 'idle') return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecordState('transcribing');
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          const audio = await blobToFloat32(blob);
          const whisper = await getWhisper();
          const result = await whisper(audio);
          const text = result.text.trim();
          if (text) onCapture(text);
        } catch {
          setError('Transcription failed — try again.');
        } finally {
          setRecordState('idle');
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecordState('recording');
    } catch {
      setUnsupported(true);
    }
  }, [recordState, onCapture]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }, []);

  useEffect(() => {
    return () => { recorderRef.current?.stop(); };
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

  const isRecording = recordState === 'recording';
  const isTranscribing = recordState === 'transcribing';
  const buttonBusy = disabled || isTranscribing || (modelLoading && !modelReady);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Button + rings */}
      <div className="relative flex items-center justify-center w-60 h-60">
        {/* Halo rings (idle) */}
        {!isRecording && !isTranscribing && (
          <>
            <div className="absolute inset-[-10px] rounded-full bg-accent/[0.05]" />
            <div className="absolute inset-[-28px] rounded-full bg-accent/[0.025]" />
            <div className="absolute inset-[-46px] rounded-full bg-accent/[0.01]" />
          </>
        )}
        {/* Pulse rings (recording) */}
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
          title={isRecording ? 'Tap to stop' : isTranscribing ? 'Transcribing…' : 'Tap to start voice capture'}
        >
          {isTranscribing ? (
            <Loader2 size={44} strokeWidth={1.25} className="text-accent animate-spin" />
          ) : isRecording ? (
            <Square size={38} strokeWidth={1.5} fill="white" className="text-white" />
          ) : (
            <Mic size={52} strokeWidth={1.25} className="text-[#07090F]" />
          )}
        </button>
      </div>

      {/* Status label */}
      {modelLoading && !modelReady ? (
        <div className="flex items-center gap-2">
          <Loader2 size={13} className="text-text3 animate-spin" />
          <span className="text-xs text-text3">Loading voice model…</span>
        </div>
      ) : isTranscribing ? (
        <div className="flex items-center gap-2">
          <Loader2 size={13} className="text-accent animate-spin" />
          <span className="text-sm font-semibold text-accent tracking-wide">Transcribing…</span>
        </div>
      ) : isRecording ? (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-sm font-semibold text-red-400 tracking-wide">Recording · tap to finish</span>
        </div>
      ) : error ? (
        <p className="text-xs text-red-400 text-center max-w-[240px]">{error}</p>
      ) : null}
    </div>
  );
}
