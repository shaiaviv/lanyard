'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { generateCoverageSuggestionAction } from '@/app/actions/suggestions';

export function GenerateSuggestionButton() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateCoverageSuggestionAction(prompt.trim() || null);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      router.push(`/planning?suggestionId=${result.id}`);
    });
  }

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: 'rgba(244,168,37,0.03)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/2 transition-colors disabled:opacity-60"
      >
        <Sparkles size={14} className="text-accent flex-shrink-0" />
        <span className="text-sm font-semibold text-text1 flex-1">Generate coverage suggestion with AI</span>
        {open ? <ChevronUp size={13} className="text-text3" /> : <ChevronDown size={13} className="text-text3" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/6 pt-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isPending}
            rows={3}
            placeholder={'Optional: describe any strategic priorities\ne.g. "Send a senior rep to APAC. Keep Maya in Europe. Prioritize treasury events."'}
            className="w-full text-sm text-text2 bg-white/3 border border-white/10 rounded-lg px-3 py-2.5 resize-none placeholder:text-text3 focus:outline-none focus:border-accent/40 disabled:opacity-50"
          />
          {error && <p className="text-xs text-warn">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-text3">
              Generates a read-only draft · never modifies real coverage
            </p>
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent text-black rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-60 flex-shrink-0"
            >
              {isPending ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                  Generating…
                </>
              ) : (
                <><Sparkles size={11} /> Generate</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
