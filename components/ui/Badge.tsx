import type { ReactNode } from 'react';

type BadgeVariant = 'T1' | 'T2' | 'T3' | 'live' | 'review' | 'warn' | 'success' | 'info';

const STYLES: Record<BadgeVariant, string> = {
  T1:      'bg-amber-400/10 text-amber-400 border-amber-400/20',
  T2:      'bg-blue-400/10  text-blue-400  border-blue-400/20',
  T3:      'bg-white/5      text-text3     border-white/10',
  live:    'bg-success/10   text-success   border-success/20',
  review:  'bg-warn/10      text-warn      border-warn/20',
  warn:    'bg-warn/10      text-warn      border-warn/20',
  success: 'bg-success/10   text-success   border-success/20',
  info:    'bg-info/10      text-info      border-info/20',
};

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function Badge({ variant, children, dot, pulse, className = '' }: BadgeProps) {
  const dotColor =
    variant === 'live' || variant === 'success' ? 'bg-success' : 'bg-warn';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 leading-none ${STYLES[variant]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''} ${dotColor}`} />
      )}
      {children}
    </span>
  );
}
