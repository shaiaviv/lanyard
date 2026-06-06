'use client';
import React from 'react';

export interface LegendItem {
  swatch: React.ReactNode;
  label: string;
  labelClass?: string;
}

export interface LegendGroup {
  title: string;
  items: LegendItem[];
}

export function Legend({ groups }: { groups: LegendGroup[] }) {
  return (
    <div className="flex flex-col gap-2 text-xs">
      {groups.map((group) => (
        <div key={group.title} className="flex items-center gap-3">
          <span className="text-text3/50 w-16 flex-shrink-0">{group.title}</span>
          <div className="flex items-center gap-3 flex-wrap">
            {group.items.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                {item.swatch}
                <span className={item.labelClass ?? 'text-text3'}>{item.label}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
