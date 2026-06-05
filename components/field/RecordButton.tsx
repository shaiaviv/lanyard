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
  const [unsupported, setUnsupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const finalRef = useRef('');

  useEffect(() => {
    if (!getSR()) setUnsupported(true);
    return () => { recognitionRef.current?.stop(); };
  }, []);

  function startRecording() {
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

    recognition.onend = () => {
      setRecording(false);
      setInterimText('');
      const transcript = finalRef.current.trim();
      if (transcript) onCapture(transcript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') setUnsupported(true);
      setRecording(false);
      setInterimText('');
    };

    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  if (unsupported) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="w-24 h-24 rounded-full bg-elevated flex items-center justify-center"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <MicOff size={28} className="text-text3" />
        </div>
        <p className="text-xs text-text2 max-w-[200px] leading-relaxed">
          Voice capture requires Chrome, Edge, or Safari. Use the form below.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Button + rings container */}
      <div className="relative flex items-center justify-center w-36 h-36">
        {/* Ambient rings (idle) */}
        {!recording && (
          <>
            <div className="absolute inset-[-4px] rounded-full bg-accent/[0.04]" />
            <div className="absolute inset-[-14px] rounded-full bg-accent/[0.025]" />
          </>
        )}
        {/* Expanding ring (recording) */}
        {recording && (
          <div
            className="absolute inset-0 rounded-full border-2 border-red-500/30 ring-out"
            style={{ transformOrigin: 'center' }}
          />
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={recording ? stopRecording : startRecording}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
            recording ? 'record-active' : 'record-idle'
          }`}
          title={recording ? 'Tap to stop' : 'Tap to start voice capture'}
        >
          {recording ? (
            <Square size={26} strokeWidth={1.5} fill="white" className="text-white" />
          ) : (
            <Mic size={32} strokeWidth={1.5} className="text-[#07090F]" />
          )}
        </button>
      </div>

      {recording ? (
        <div className="flex flex-col items-center gap-2 max-w-[260px]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-sm font-semibold text-red-400">Recording · tap to finish</span>
          </div>
          {interimText && (
            <p className="text-xs text-text2 text-center leading-relaxed line-clamp-3">
              {interimText}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-text3 text-center leading-relaxed">
          Tap to record a voice note
          <br />
          or use the form below
        </p>
      )}
    </div>
  );
}
