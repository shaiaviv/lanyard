'use client';
import Link from 'next/link';
import { Bot, Cpu, X } from 'lucide-react';
import type { CoverageSuggestion } from '@/lib/types';

export function SuggestionBanner({ suggestion }: { suggestion: CoverageSuggestion }) {
  const isHeuristic = suggestion.source === 'heuristic';
  const Icon = isHeuristic ? Cpu : Bot;
  const promptEcho = suggestion.prompt?.trim()
    ? `"${suggestion.prompt.length > 60 ? suggestion.prompt.slice(0, 60) + '…' : suggestion.prompt}"`
    : 'Balanced default';

  const generated = new Date(suggestion.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium mb-4"
      style={{
        background: isHeuristic ? 'rgba(96,165,250,0.06)' : 'rgba(244,168,37,0.07)',
        border: `1px solid ${isHeuristic ? 'rgba(96,165,250,0.22)' : 'rgba(244,168,37,0.22)'}`,
      }}
    >
      <Icon size={15} className={isHeuristic ? 'text-blue-400' : 'text-accent'} />
      <span className={isHeuristic ? 'text-blue-300' : 'text-accent'}>
        {isHeuristic ? 'Heuristic suggestion' : 'AI suggestion'}
      </span>
      <span className="text-white/30">·</span>
      <span className="text-text2 font-normal truncate max-w-[360px]">{promptEcho}</span>
      <span className="text-white/30">·</span>
      <span className="text-text3 font-normal text-xs">{generated}</span>
      <div className="flex-1" />
      <Link
        href="/planning"
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-text2 border border-white/10 hover:border-white/20 hover:text-text1 transition-colors"
      >
        <X size={11} /> Exit to real state
      </Link>
    </div>
  );
}
