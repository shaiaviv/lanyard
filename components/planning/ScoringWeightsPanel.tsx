'use client';
import { useState, useTransition } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw, Check } from 'lucide-react';
import { saveScoringWeights } from '@/app/actions/planning';
import {
  DEFAULT_WEIGHTS,
  WEIGHT_FACTORS,
  type ScoringWeights,
} from '@/lib/scoring/computeIcpScore';

/**
 * The marquee C4 control. Dragging a weight recomputes every conference's score + tier
 * INSTANTLY, client-side, with no AI call (the AI estimated the factor inputs once; this is
 * the transparent, tunable formula on top). "Save as default" persists the weights team-wide.
 */
export function ScoringWeightsPanel({
  weights,
  onChange,
}: {
  weights: ScoringWeights;
  onChange: (w: ScoringWeights) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const total = WEIGHT_FACTORS.reduce((sum, f) => sum + weights[f.key], 0);
  const isDefault = WEIGHT_FACTORS.every((f) => weights[f.key] === DEFAULT_WEIGHTS[f.key]);

  function set(key: keyof ScoringWeights, value: number) {
    setSaved(false);
    onChange({ ...weights, [key]: value });
  }

  function save() {
    startTransition(async () => {
      const res = await saveScoringWeights(weights);
      if (!('error' in res)) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.015] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-text1">
          <SlidersHorizontal size={15} className="text-accent" />
          ICP scoring weights
        </span>
        <span className="flex items-center gap-2 text-xs text-text3">
          {isDefault ? 'Default methodology' : 'Custom'}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-white/6 space-y-3.5">
          <p className="text-xs text-text3 leading-relaxed pt-3">
            The AI estimates each factor once per conference; these weights combine them into the
            score live. Quality over headcount — ICP density is weighted highest by default.
          </p>

          {WEIGHT_FACTORS.map((f) => {
            const pct = total > 0 ? Math.round((weights[f.key] / total) * 100) : 0;
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text2">{f.label}</span>
                  <span className="text-xs font-bold tabular-nums text-accent">{pct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={weights[f.key]}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                  aria-label={f.label}
                />
                <p className="text-[11px] text-text3 mt-0.5 leading-snug">{f.hint}</p>
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={isPending || isDefault}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/15 transition-all disabled:opacity-40"
            >
              {saved ? <Check size={12} /> : null}
              {saved ? 'Saved as team default' : 'Save as default'}
            </button>
            <button
              onClick={() => {
                setSaved(false);
                onChange({ ...DEFAULT_WEIGHTS });
              }}
              disabled={isDefault}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-text3 hover:text-text2 border border-white/8 transition-all disabled:opacity-30"
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
