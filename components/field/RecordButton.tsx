'use client';
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, MicOff } from 'lucide-react';

interface RecordButtonProps {
  onCapture: (audioBase64: string) => void;
  disabled?: boolean;
}

export function RecordButton({ onCapture, disabled }: RecordButtonProps) {
  const [recording, setRecording] = useState(false);
  const [denied, setDenied] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      mediaRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          // Strip the data URL prefix ("data:audio/webm;base64,")
          const dataUrl = reader.result as string;
          const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
          onCapture(base64);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      mediaRef.current = recorder;
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setDenied(true);
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
    setSeconds(0);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  if (denied) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center">
          <MicOff size={28} className="text-zinc-400" />
        </div>
        <p className="text-xs text-zinc-500 max-w-[220px]">
          Microphone access denied. Allow access in your browser settings to use voice capture.
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
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-mono font-semibold text-red-600 tabular-nums">
            {formatTime(seconds)}
          </span>
          <span className="text-xs text-zinc-400">· tap to stop</span>
        </div>
      ) : (
        <p className="text-xs text-zinc-400 text-center">
          Tap to record · or use<br />the manual form below
        </p>
      )}
    </div>
  );
}
