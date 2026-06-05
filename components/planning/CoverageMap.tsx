'use client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import type { Conference } from '@/lib/types';

const TIER_COLOR: Record<string, string> = {
  T1: '#f59e0b',
  T2: '#60a5fa',
  T3: '#94a3b8',
};

export default function CoverageMap({
  conferences,
  committedByConf,
}: {
  conferences: Conference[];
  committedByConf: Record<string, string[]>;
}) {
  const located = conferences.filter((c) => c.latitude != null && c.longitude != null);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 460 }}>
      <MapContainer
        center={[40, 5]}
        zoom={2}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#0C1220' }}
      >
        <TileLayer
          // Carto dark tiles — matches the app's dark theme; keyless (OSM data, CC-BY)
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {located.map((c) => {
          const covered = (committedByConf[c.id] ?? []).length > 0;
          const tierColor = TIER_COLOR[c.tier ?? 'T3'] ?? '#94a3b8';
          const radius = 6 + Math.round(((c.icpScore ?? 50) / 100) * 10);
          return (
            <CircleMarker
              key={c.id}
              center={[c.latitude as number, c.longitude as number]}
              radius={radius}
              pathOptions={{
                color: covered ? '#10b981' : tierColor,
                weight: covered ? 3 : 1.5,
                fillColor: tierColor,
                fillOpacity: 0.55,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                  <strong>{c.name}</strong>
                  <br />
                  {c.location ?? ''} · {c.tier ?? '—'} · ICP {c.icpScore ?? '—'}
                  <br />
                  {covered ? `Covered: ${committedByConf[c.id].join(', ')}` : 'No committed rep'}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
