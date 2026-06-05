'use client';
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, MicOff } from 'lucide-react';

interface RecordButtonProps {
  onCapture: (transcript: string) => void;
  disabled?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSR(): any {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function RecordButton({ onCapture, disabled }: RecordButtonProps) {
  const [recording, setRecording] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalRef.current += text + ' ';
        } else {
          interim += text;
        }
      }
      setInterimText(finalRef.current + interim);
    };

    recognition.onend = () => {
      setRecording(false);
      setInterimText('');
      const transcript = finalRef.current.trim();
      if (transcript) onCapture(transcript);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
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
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center">
          <MicOff size={28} className="text-zinc-400" />
        </div>
        <p className="text-xs text-zinc-500 max-w-[220px]">
          Voice capture requires Chrome, Edge, or Safari. Use the manual form below.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={recording ? stopRecording : startRecording}
        className={`w-20 h-20 rounded-full text-white flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
          recording
            ? 'bg-red-500 shadow-red-200'
            : 'bg-orange-500 shadow-orange-200 hover:bg-orange-600'
        }`}
        title={recording ? 'Tap to stop' : 'Tap to start voice capture'}
      >
        {recording ? (
          <Square size={26} strokeWidth={1.5} fill="white" />
        ) : (
          <Mic size={32} strokeWidth={1.5} />
        )}
      </button>

      {recording ? (
        <div className="flex flex-col items-center gap-1.5 max-w-[260px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-600">Listening… tap to stop</span>
          </div>
          {interimText && (
            <p className="text-xs text-zinc-400 text-center leading-relaxed line-clamp-3">
              {interimText}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-400 text-center">
          Tap to record · or use<br />the manual form below
        </p>
      )}
    </div>
  );
}
