'use client';
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, MicOff } from 'lucide-react';

interface RecordButtonProps {
  onCapture: (transcript: string) => void;
  disabled?: boolean;
}

type SR = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (e: SREvent) => void;
  onend: () => void;
  onerror: (e: SRError) => void;
  start: () => void;
  stop: () => void;
};
type SREvent = { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] };
type SRError = { error: string };

function getSR(): SR | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SR | null;
}

export function RecordButton({ onCapture, disabled }: RecordButtonProps) {
  const [recording, setRecording] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const finalRef = useRef('');

  useEffect(() => {
    if (!getSR()) setUnsupported(true);
    return () => { recognitionRef.current?.stop(); };
  }, []);

  function startRecording() {
    if (initializing || recording) return;
    const SR = getSR();
    if (!SR) { setUnsupported(true); return; }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    finalRef.current = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalRef.current += text + ' ';
        else interim += text;
      }
      setInterimText(finalRef.current + interim);
    };

    recognition.onstart = () => {
      setInitializing(false);
      setRecording(true);
    };

    recognition.onend = () => {
      setRecording(false);
      setInitializing(false);
      setInterimText('');
      const transcript = finalRef.current.trim();
      if (transcript) onCapture(transcript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') setUnsupported(true);
      setRecording(false);
      setInitializing(false);
      setInterimText('');
    };

    recognition.start();
    recognitionRef.current = recognition;
    setInitializing(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

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

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Button + rings container */}
      <div className="relative flex items-center justify-center w-60 h-60">
        {/* Ambient halo rings (idle only) */}
        {!recording && (
          <>
            <div className="absolute inset-[-10px] rounded-full bg-accent/[0.05]" />
            <div className="absolute inset-[-28px] rounded-full bg-accent/[0.025]" />
            <div className="absolute inset-[-46px] rounded-full bg-accent/[0.01]" />
          </>
        )}
        {/* Expanding pulse ring (recording) */}
        {recording && (
          <>
            <div
              className="absolute inset-0 rounded-full border-2 border-red-500/40 ring-out"
              style={{ transformOrigin: 'center' }}
            />
            <div
              className="absolute inset-0 rounded-full border border-red-500/20 ring-out delay-200"
              style={{ transformOrigin: 'center' }}
            />
          </>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={recording ? stopRecording : startRecording}
          className={`relative w-44 h-44 rounded-full flex items-center justify-center transition-transform duration-150 active:scale-95 hover:scale-[1.03] disabled:opacity-40 disabled:cursor-not-allowed ${
            recording ? 'record-active' : 'record-idle'
          }`}
          title={recording ? 'Tap to stop' : initializing ? 'Warming up…' : 'Tap to start voice capture'}
        >
          {recording ? (
            <Square size={38} strokeWidth={1.5} fill="white" className="text-white" />
          ) : (
            <Mic size={52} strokeWidth={1.25} className="text-[#07090F]" />
          )}
        </button>
      </div>

      {initializing ? (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-sm font-semibold text-yellow-400 tracking-wide">Get ready…</span>
        </div>
      ) : recording ? (
        <div className="flex flex-col items-center gap-2 max-w-[280px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-sm font-semibold text-red-400 tracking-wide">Recording · tap to finish</span>
          </div>
          {interimText && (
            <p className="text-sm text-text2 text-center leading-relaxed line-clamp-3 italic">
              &ldquo;{interimText}&rdquo;
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
