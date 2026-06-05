'use client';
import { useState } from 'react';
import { Fingerprint, MapPin, Calendar, ArrowRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Conference } from '@/lib/types';


function dateRange(conf: Conference): string | null {
  if (!conf.startDate) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (!conf.endDate || conf.endDate === conf.startDate) return fmt(conf.startDate);
  return `${fmt(conf.startDate)} – ${fmt(conf.endDate)}`;
}

function isLive(conf: Conference): boolean {
  if (!conf.startDate || !conf.endDate) return false;
  const today = new Date().toISOString().split('T')[0];
  return conf.startDate <= today && today <= conf.endDate;
}

interface Props {
  conferences: Conference[];
  onSelect: (id: string) => void;
}

export function ConferenceGate({ conferences, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const sorted = [...conferences]
    .filter((c) => !c.endDate || c.endDate >= new Date().toISOString().split('T')[0])
    .sort((a, b) => {
      if (isLive(a) !== isLive(b)) return isLive(a) ? -1 : 1;
      return (a.startDate ?? '').localeCompare(b.startDate ?? '');
    });

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-2 mb-5 animate-fade-in">
          <Fingerprint size={18} className="text-accent" strokeWidth={1.5} />
          <span className="text-[13px] font-semibold text-text2">Lanyard</span>
        </div>
        <h1 className="text-[22px] font-bold text-text1 leading-tight animate-fade-up delay-50">
          Which conference are you at?
        </h1>
        <p className="text-sm text-text2 mt-2 leading-relaxed animate-fade-up delay-100">
          Select to start capturing contacts
        </p>
      </div>

      {/* Conference cards */}
      <div className="flex-1 px-5 space-y-2.5 overflow-y-auto pb-4">
        {sorted.map((conf, index) => {
          const isSelected = selected === conf.id;
          const live = isLive(conf);
          const dates = dateRange(conf);

          return (
            <button
              key={conf.id}
              onClick={() => setSelected(conf.id)}
              className="w-full text-left rounded-2xl transition-all active:scale-[0.99] animate-fade-up hover:-translate-y-0.5"
              style={{
                animationDelay: `${150 + index * 60}ms`,
                background: isSelected ? 'rgba(244,168,37,0.07)' : '#161E2E',
                border: isSelected
                  ? '1.5px solid rgba(244,168,37,0.3)'
                  : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isSelected
                  ? '0 4px 24px rgba(244,168,37,0.1)'
                  : '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <div className="px-4 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {live && <Badge variant="live" dot pulse>Live</Badge>}
                    {conf.tier && (
                      <Badge variant={conf.tier as 'T1' | 'T2' | 'T3'}>{conf.tier}</Badge>
                    )}
                  </div>
                  <p className="text-[15px] font-semibold text-text1 leading-snug">{conf.name}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-text3 flex-wrap">
                    {dates && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {dates}
                      </span>
                    )}
                    {conf.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />
                        {conf.location}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-accent' : 'border border-[rgba(255,255,255,0.15)]'
                  }`}
                >
                  {isSelected && <Check size={11} className="text-[#07090F]" strokeWidth={2.5} />}
                </div>
              </div>
            </button>
          );
        })}

        {sorted.length === 0 && (
          <div className="text-center py-16 text-sm text-text3 leading-relaxed">
            No upcoming conferences found.
            <br />
            Add some in the Planning hub.
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-8 pt-4 animate-fade-up delay-400">
        <button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="w-full h-[52px] rounded-xl bg-accent text-[#07090F] font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            boxShadow: selected ? '0 4px 28px rgba(244,168,37,0.28)' : 'none',
          }}
        >
          Start capturing
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
