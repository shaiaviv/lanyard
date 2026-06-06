// Pure trip-clustering and order computation — shared by timeline (order/cluster labels) and map
// (polyline route). No server-only, no DB imports.
import type { TripCluster } from '@/lib/types';

// Thresholds — tunable, exported for UI display.
export const CLUSTER_DAYS = 21;   // gap between consecutive stops (days)
export const CLUSTER_KM = 800;    // haversine distance threshold (km)

interface StopInput {
  conferenceId: string;
  startDate: string | null;
  endDate: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function gapDays(aEnd: string | null, bStart: string | null): number {
  if (!aEnd || !bStart) return 0; // missing dates — treat as adjacent (non-blocking)
  return (new Date(bStart).getTime() - new Date(aEnd).getTime()) / 86_400_000;
}

function isClose(a: StopInput, b: StopInput): boolean {
  if (a.region && b.region && a.region === b.region) return true;
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    return haversineKm(a.lat, a.lng, b.lat, b.lng) <= CLUSTER_KM;
  }
  return false;
}

let _clusterSeq = 0;
function newClusterId() {
  _clusterSeq += 1;
  return `cluster-${_clusterSeq}`;
}

export interface ClusterResult {
  order: Map<string, number>;    // conferenceId → 1-based visit order
  clusters: TripCluster[];
}

export function clusterTrips(repId: string, stops: StopInput[]): ClusterResult {
  const sorted = [...stops].sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  });

  const order = new Map<string, number>();
  sorted.forEach((s, i) => order.set(s.conferenceId, i + 1));

  // Build clusters: a maximal consecutive run where each adjacent pair is within CLUSTER_DAYS
  // AND geographically close (same region or ≤ CLUSTER_KM).
  const clusters: TripCluster[] = [];
  let runStart = 0;

  for (let i = 1; i <= sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const endRun =
      i === sorted.length ||
      gapDays(prev.endDate, curr?.startDate ?? null) > CLUSTER_DAYS ||
      !isClose(prev, curr!);

    if (endRun) {
      const run = sorted.slice(runStart, i);
      if (run.length >= 2) {
        const first = run[0];
        const monthShort = first.startDate
          ? new Date(first.startDate).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
          : '?';
        const label = `${first.region ?? 'Multi'} · ${monthShort}`;
        clusters.push({ id: newClusterId(), repId, label, conferenceIds: run.map((s) => s.conferenceId) });
      }
      runStart = i;
    }
  }

  return { order, clusters };
}
