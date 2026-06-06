'use client';
import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { generateCoverageSuggestionAction } from '@/app/actions/suggestions';
import type { SuggestionToastState } from '@/components/planning/SuggestionToast';

export function GenerateSuggestionButton({
  onToastUpdate,
  isGenerating,
}: {
  onToastUpdate: (state: SuggestionToastState) => void;
  isGenerating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');

  function handleGenerate() {
    const p = prompt.trim() || null;
    setOpen(false);
    setPrompt('');
    onToastUpdate({ status: 'running' });

    generateCoverageSuggestionAction(p).then((result) => {
      if ('error' in result) {
        onToastUpdate({ status: 'error', message: result.error, noKey: result.noKey });
      } else {
        onToastUpdate({ status: 'done', suggestionId: result.id });
      }
    }).catch(() => {
      onToastUpdate({ status: 'error', message: 'Unexpected error. Please try again.' });
    });
  }

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: 'rgba(244,168,37,0.03)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isGenerating}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/2 transition-colors disabled:opacity-50"
      >
        {isGenerating ? (
          <span
            className="w-3.5 h-3.5 rounded-full border-2 animate-spin flex-shrink-0"
            style={{ borderColor: 'rgba(244,168,37,0.25)', borderTopColor: '#f4a825' }}
          />
        ) : (
          <Sparkles size={14} className="text-accent flex-shrink-0" />
        )}
        <span className="text-sm font-semibold text-text1 flex-1">
          {isGenerating ? 'Generating coverage plan…' : 'Generate coverage suggestion with AI'}
        </span>
        {!isGenerating && (open ? <ChevronUp size={13} className="text-text3" /> : <ChevronDown size={13} className="text-text3" />)}
      </button>

      {open && !isGenerating && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/6 pt-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={'Optional: describe any strategic priorities\ne.g. "Send a senior rep to APAC. Keep Maya in Europe. Prioritize treasury events."'}
            className="w-full text-sm text-text2 bg-white/3 border border-white/10 rounded-lg px-3 py-2.5 resize-none placeholder:text-text3 focus:outline-none focus:border-accent/40"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-text3">
              Generates a read-only draft · never modifies real coverage
            </p>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent text-black rounded-lg hover:bg-accent/90 transition-colors flex-shrink-0"
            >
              <Sparkles size={11} /> Generate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
