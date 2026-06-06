'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { CheckCircle, XCircle } from 'lucide-react';

const MESSAGES = [
  'Reading 190 conferences…',
  'Matching reps to home regions…',
  'Checking T1 coverage gaps…',
  'Clustering nearby trips…',
  'Balancing team capacity…',
  'Weighing ICP scores…',
  'Optimising travel budget…',
  'Finalising the plan…',
];

export type SuggestionToastState =
  | { status: 'running' }
  | { status: 'done'; suggestionId: string }
  | { status: 'error'; message: string; noKey?: boolean };

export function SuggestionToast({
  state,
  onDismiss,
}: {
  state: SuggestionToastState;
  onDismiss: () => void;
}) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Auto-dismiss 6 s after completion or error
  useEffect(() => {
    if (state.status === 'running') return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [state.status, onDismiss]);

  // Rotate messages with a fade cross-dissolve
  useEffect(() => {
    if (state.status !== 'running') return;
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % MESSAGES.length);
        setFading(false);
      }, 280);
    }, 2600);
    return () => clearInterval(t);
  }, [state.status]);

  if (!mounted) return null;

  const accentColor =
    state.status === 'done' ? '#10b981' :
    state.status === 'error' ? '#ef4444' :
    '#f4a825';

  const toast = (
    <div
      className="fixed bottom-5 right-5 z-50 w-72 rounded-2xl shadow-2xl overflow-hidden"
      style={{
        background: 'rgba(11,15,26,0.97)',
        border: `1px solid ${accentColor}40`,
        backdropFilter: 'blur(14px)',
      }}
    >
      <div className="px-4 py-3.5 flex items-start gap-3">
        {/* Status icon */}
        <div className="flex-shrink-0 mt-0.5">
          {state.status === 'running' && (
            <div
              className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: `${accentColor}30`, borderTopColor: accentColor }}
            />
          )}
          {state.status === 'done' && <CheckCircle size={16} className="text-success" />}
          {state.status === 'error' && <XCircle size={16} className="text-warn" />}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text1">
            {state.status === 'running' && 'Generating coverage plan'}
            {state.status === 'done' && 'Coverage plan ready'}
            {state.status === 'error' && 'Generation failed'}
          </p>

          <div className="mt-0.5 min-h-[16px]">
            {state.status === 'running' && (
              <p
                className="text-[11px] text-text3 transition-opacity duration-300"
                style={{ opacity: fading ? 0 : 1 }}
              >
                {MESSAGES[msgIdx]}
              </p>
            )}
            {state.status === 'done' && (
              <Link
                href={`/planning?suggestionId=${state.suggestionId}`}
                className="text-[11px] font-medium"
                style={{ color: accentColor }}
              >
                View suggestion →
              </Link>
            )}
            {state.status === 'error' && (
              <p className="text-[11px] text-text3 leading-relaxed">
                {state.message}
                {state.noKey && (
                  <>
                    {' '}
                    <Link href="/settings" className="text-warn underline">
                      Settings →
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-text3 hover:text-text1 transition-colors text-base leading-none -mt-0.5"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Progress bar — advances with the message index as a proxy for elapsed time */}
      {state.status === 'running' && (
        <div className="h-px w-full" style={{ background: `${accentColor}18` }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              background: `${accentColor}80`,
              width: `${Math.round(((msgIdx + 1) / MESSAGES.length) * 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );

  return createPortal(toast, document.body);
}
