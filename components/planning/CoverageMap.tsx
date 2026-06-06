'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, Polyline } from 'react-leaflet';
import type { Conference, Rep, SuggestionDraft } from '@/lib/types';

const TIER_COLOR: Record<string, string> = {
  T1: '#f59e0b',
  T2: '#60a5fa',
  T3: '#94a3b8',
};

function numberedIcon(order: number, locked: boolean) {
  const bg = locked ? 'rgba(16,185,129,0.85)' : 'rgba(244,168,37,0.85)';
  const border = locked ? '#10b981' : '#f4a825';
  return L.divIcon({
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${bg};border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;box-shadow:0 1px 4px rgba(0,0,0,0.5)">${order}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function CoverageMap({
  conferences,
  committedByConf,
  repFilter,
  repId,
  suggestion,
  reps,
}: {
  conferences: Conference[];
  committedByConf: Record<string, string[]>;
  repFilter?: string;
  repId?: string;
  suggestion?: SuggestionDraft;
  reps?: Rep[];
}) {
  const located = conferences.filter((c) => c.latitude != null && c.longitude != null);

  // Itinerary view when a rep is selected: numbered pins + polyline.
  if (repId && repId !== 'all') {
    const repName = reps?.find((r) => r.id === repId)?.name ?? repId;

    // Gather assignments for this rep (from suggestion draft or real committedByConf).
    let itineraryConfs: { conf: Conference; order: number; locked: boolean }[] = [];

    if (suggestion) {
      // Sort by original order (chronological), keep only mapped stops, then renumber 1..N.
      // The original a.order can have gaps (unmapped stops were numbered too), so renumber
      // after filtering — otherwise the map shows "2, 4, 5" instead of "1, 2, 3".
      const repAssignments = suggestion.assignments
        .filter((a) => a.repId === repId)
        .sort((a, b) => a.order - b.order);

      itineraryConfs = repAssignments
        .flatMap((a) => {
          const conf = located.find((c) => c.id === a.conferenceId);
          return conf ? [{ conf, order: 0 /* renumbered below */, locked: a.locked }] : [];
        });

      // Renumber sequentially now that unmapped stops are gone
      itineraryConfs.forEach((s, i) => { s.order = i + 1; });
    } else {
      // Real mode: conferences where THIS specific rep is committed/suggested, sorted by date.
      // committedByConf values are rep names, so resolve repId → name first.
      const repName = reps?.find((r) => r.id === repId)?.name ?? repId;
      const assigned = located
        .filter((c) => (committedByConf[c.id] ?? []).includes(repName))
        .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
      itineraryConfs = assigned.map((conf, i) => ({ conf, order: i + 1, locked: true }));
    }

    const unmappedCount =
      suggestion?.assignments.filter((a) => a.repId === repId && located.every((c) => c.id !== a.conferenceId)).length ?? 0;

    const positions: [number, number][] = itineraryConfs.map((s) => [
      s.conf.latitude as number,
      s.conf.longitude as number,
    ]);

    return (
      <div className="space-y-2">
        <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 460 }}>
          <MapContainer
            center={positions.length > 0 ? positions[0] : [40, 5]}
            zoom={positions.length > 1 ? 3 : 5}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', background: '#0C1220' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {positions.length >= 2 && (
              <Polyline
                positions={positions}
                pathOptions={{ color: '#f59e0b', weight: 1.5, dashArray: '6,4', opacity: 0.55 }}
              />
            )}
            {itineraryConfs.map(({ conf, order, locked }) => (
              <Marker
                key={conf.id}
                position={[conf.latitude as number, conf.longitude as number]}
                icon={numberedIcon(order, locked)}
              >
                <Tooltip direction="top" offset={[0, -14]} opacity={1}>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <strong>{conf.name}</strong>
                    <br />
                    {conf.startDate
                      ? `${new Date(conf.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}${conf.endDate && conf.endDate !== conf.startDate ? ` – ${new Date(conf.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`
                      : 'Date TBD'}
                    <br />
                    <span style={{ color: locked ? '#10b981' : '#f4a825' }}>
                      Stop {order} of {itineraryConfs.length}{locked ? ' · committed' : ' · proposed'}
                    </span>
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div className="flex items-center gap-4 text-xs text-text3 flex-wrap">
          <span className="font-medium text-text2">{repName}</span>
          <span>{itineraryConfs.length} mapped stop{itineraryConfs.length !== 1 ? 's' : ''}</span>
          {unmappedCount > 0 && (
            <span className="text-warn">{unmappedCount} stop{unmappedCount > 1 ? 's' : ''} not mapped (no location)</span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(16,185,129,0.85)', border: '2px solid #10b981' }} /> committed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(244,168,37,0.85)', border: '2px solid #f4a825' }} /> proposed
          </span>
        </div>
      </div>
    );
  }

  // Default all-events circle view.
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 460 }}>
      <MapContainer
        center={[40, 5]}
        zoom={2}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#0C1220' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {located.map((c) => {
          const coverageNames = committedByConf[c.id] ?? [];
          const covered = coverageNames.length > 0;
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
                  {covered ? `Covered: ${coverageNames.join(', ')}` : 'No committed rep'}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
