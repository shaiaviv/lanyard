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

// Pixel offset encoded into iconAnchor so the icon shifts visually while
// the lat/lng anchor (and tooltip origin) stay at the geographic point.
function numberedIcon(order: number, locked: boolean, offset: [number, number] = [0, 0]) {
  const [dx, dy] = offset;
  const bg = locked ? 'rgba(16,185,129,0.85)' : 'rgba(244,168,37,0.85)';
  const border = locked ? '#10b981' : '#f4a825';
  return L.divIcon({
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${bg};border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;box-shadow:0 1px 4px rgba(0,0,0,0.5)">${order}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12 - dx, 12 - dy],
  });
}

function dateRange(conf: Conference): string {
  if (!conf.startDate) return 'Date TBD';
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const start = fmt(conf.startDate);
  if (!conf.endDate || conf.endDate === conf.startDate) return start;
  return `${start} – ${fmt(conf.endDate)}`;
}

function gapDays(endDate: string | null | undefined, startDate: string | null | undefined): number {
  if (!endDate || !startDate) return Infinity;
  return (new Date(startDate).getTime() - new Date(endDate).getTime()) / 86_400_000;
}

const coordKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;
const OFFSET_R = 14; // px — radius of the scatter circle for colocated pins
const TRIP_GAP = 31; // days — max gap between stops to draw a connecting line

export default function CoverageMap({
  conferences,
  committedByConf,
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

  // ── Itinerary view (rep selected) ───────────────────────────────────────────
  if (repId && repId !== 'all') {
    const repName = reps?.find((r) => r.id === repId)?.name ?? repId;
    let itineraryConfs: { conf: Conference; order: number; locked: boolean }[] = [];

    if (suggestion) {
      const repAssignments = suggestion.assignments
        .filter((a) => a.repId === repId)
        .sort((a, b) => a.order - b.order);
      itineraryConfs = repAssignments.flatMap((a) => {
        const conf = located.find((c) => c.id === a.conferenceId);
        return conf ? [{ conf, order: 0, locked: a.locked }] : [];
      });
      itineraryConfs.forEach((s, i) => { s.order = i + 1; });
    } else {
      const assigned = located
        .filter((c) => (committedByConf[c.id] ?? []).includes(repName))
        .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
      itineraryConfs = assigned.map((conf, i) => ({ conf, order: i + 1, locked: true }));
    }

    const unmappedCount =
      suggestion?.assignments.filter(
        (a) => a.repId === repId && located.every((c) => c.id !== a.conferenceId),
      ).length ?? 0;

    // ── Colocated groups → circular pixel offsets ───────────────────────────
    // When multiple stops share exact coordinates, scatter them in a small circle
    // (radius = OFFSET_R px) so each pin is independently visible and hoverable.
    const groupsByCoord = new Map<string, number[]>();
    itineraryConfs.forEach((s, i) => {
      const key = coordKey(s.conf.latitude as number, s.conf.longitude as number);
      const arr = groupsByCoord.get(key);
      if (arr) arr.push(i); else groupsByCoord.set(key, [i]);
    });

    const offsetByIdx = new Map<number, [number, number]>();
    for (const indices of groupsByCoord.values()) {
      // Sort group by stop order so the earliest stop gets the top-most position
      const sorted = [...indices].sort((a, b) => itineraryConfs[a].order - itineraryConfs[b].order);
      sorted.forEach((idx, rank) => {
        if (sorted.length === 1) { offsetByIdx.set(idx, [0, 0]); return; }
        // Start at top (−π/2) and go clockwise
        const angle = -Math.PI / 2 + (2 * Math.PI / sorted.length) * rank;
        offsetByIdx.set(idx, [
          Math.round(Math.cos(angle) * OFFSET_R),
          Math.round(Math.sin(angle) * OFFSET_R),
        ]);
      });
    }

    // ── Trip segments: only connect stops ≤31 days apart ───────────────────
    // Reps travel home between trips. A line only makes sense within a single
    // continuous trip (conference run), not across the full year.
    const tripSegments: [number, number][][] = [];
    let seg: [number, number][] = [];
    itineraryConfs.forEach(({ conf }, i) => {
      const pt: [number, number] = [conf.latitude as number, conf.longitude as number];
      if (i === 0) { seg = [pt]; return; }
      if (gapDays(itineraryConfs[i - 1].conf.endDate, conf.startDate) <= TRIP_GAP) {
        seg.push(pt);
      } else {
        if (seg.length >= 2) tripSegments.push(seg);
        seg = [pt];
      }
    });
    if (seg.length >= 2) tripSegments.push(seg);

    const center: [number, number] =
      itineraryConfs.length > 0
        ? [
            itineraryConfs.reduce((s, c) => s + (c.conf.latitude as number), 0) / itineraryConfs.length,
            itineraryConfs.reduce((s, c) => s + (c.conf.longitude as number), 0) / itineraryConfs.length,
          ]
        : [40, 5];

    return (
      <div className="space-y-2">
        <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 460 }}>
          <MapContainer
            center={center}
            zoom={itineraryConfs.length > 1 ? 3 : 5}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', background: '#0C1220' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Trip lines — only within a continuous trip (≤31-day gap) */}
            {tripSegments.map((s, i) => (
              <Polyline
                key={i}
                positions={s}
                pathOptions={{ color: '#f59e0b', weight: 1.5, dashArray: '6,4', opacity: 0.55 }}
              />
            ))}

            {/* Markers — render descending order so pin 1 is topmost in the DOM */}
            {[...itineraryConfs]
              .map((s, i) => ({ ...s, idx: i }))
              .sort((a, b) => b.order - a.order)
              .map(({ conf, order, locked, idx }) => {
                const [dx, dy] = offsetByIdx.get(idx) ?? [0, 0];
                const key = coordKey(conf.latitude as number, conf.longitude as number);
                const colocated = (groupsByCoord.get(key) ?? [])
                  .filter((gi) => gi !== idx)
                  .map((gi) => itineraryConfs[gi].order)
                  .sort((a, b) => a - b);
                return (
                  <Marker
                    key={conf.id}
                    position={[conf.latitude as number, conf.longitude as number]}
                    icon={numberedIcon(order, locked, [dx, dy])}
                  >
                    {/* Tooltip offset compensates for the icon's pixel shift so it
                        always appears 14px above the visual center of the pin */}
                    <Tooltip direction="top" offset={[dx, dy - 14]} opacity={1}>
                      <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                        <strong>{conf.name}</strong>
                        <br />
                        {dateRange(conf)}
                        <br />
                        <span style={{ color: locked ? '#10b981' : '#f4a825' }}>
                          Stop {order} of {itineraryConfs.length}
                          {locked ? ' · committed' : ' · proposed'}
                        </span>
                        {colocated.length > 0 && (
                          <>
                            <br />
                            <span style={{ color: '#6B82A0' }}>
                              Also here: stop{colocated.length > 1 ? 's' : ''}{' '}
                              {colocated.join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </Tooltip>
                  </Marker>
                );
              })}
          </MapContainer>
        </div>

        <div className="flex items-center gap-4 text-xs text-text3 flex-wrap">
          <span className="font-medium text-text2">{repName}</span>
          <span>{itineraryConfs.length} stop{itineraryConfs.length !== 1 ? 's' : ''}</span>
          {unmappedCount > 0 && (
            <span className="text-warn">
              {unmappedCount} unmapped (no coordinates)
            </span>
          )}
          {tripSegments.length > 0 && (
            <span>
              {tripSegments.length} trip{tripSegments.length !== 1 ? 's' : ''} shown
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: 'rgba(16,185,129,0.85)', border: '2px solid #10b981' }} />
            committed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: 'rgba(244,168,37,0.85)', border: '2px solid #f4a825' }} />
            proposed
          </span>
        </div>
      </div>
    );
  }

  // ── Default all-events circle view ──────────────────────────────────────────
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
