// Offline-first capture queue (plans/tech/1-field.md §2). IndexedDB (via idb) holds captures —
// audio + fields — so capture works fully offline and NEVER loses a lead. The sync manager drains
// this through the pipeline on reconnect. Audio is the source of truth (P2): keep the Blob until
// the encounter row + uploaded audio are confirmed.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type CaptureStatus =
  | 'recorded' // audio captured, not yet uploaded/processed
  | 'uploading'
  | 'processing' // server pipeline running
  | 'draft' // pipeline returned a draft, awaiting review
  | 'committed' // written to DB
  | 'error';

export interface QueuedCapture {
  id: string;
  audioBlob: Blob;
  conferenceId: string | null;
  repId: string | null;
  occurredAt: string; // ISO
  status: CaptureStatus;
  draft?: unknown; // CaptureDraft once processed
  error?: string;
}

interface LanyardDB extends DBSchema {
  captures: {
    key: string;
    value: QueuedCapture;
    indexes: { 'by-status': CaptureStatus };
  };
}

let dbp: Promise<IDBPDatabase<LanyardDB>> | null = null;
function db() {
  return (dbp ??= openDB<LanyardDB>('lanyard', 1, {
    upgrade(d) {
      const store = d.createObjectStore('captures', { keyPath: 'id' });
      store.createIndex('by-status', 'status');
    },
  }));
}

/** Persist a new capture immediately (optimistic — rep is free to move on). */
export async function enqueueCapture(
  c: Omit<QueuedCapture, 'id' | 'status' | 'occurredAt'> & Partial<Pick<QueuedCapture, 'occurredAt'>>,
): Promise<string> {
  const id = crypto.randomUUID();
  await (await db()).put('captures', {
    id,
    status: 'recorded',
    occurredAt: c.occurredAt ?? new Date().toISOString(),
    audioBlob: c.audioBlob,
    conferenceId: c.conferenceId,
    repId: c.repId,
  });
  return id;
}

export async function listCaptures(): Promise<QueuedCapture[]> {
  return (await db()).getAll('captures');
}

export async function getByStatus(status: CaptureStatus): Promise<QueuedCapture[]> {
  return (await db()).getAllFromIndex('captures', 'by-status', status);
}

export async function updateCapture(id: string, patch: Partial<QueuedCapture>): Promise<void> {
  const d = await db();
  const existing = await d.get('captures', id);
  if (existing) await d.put('captures', { ...existing, ...patch });
}

export async function removeCapture(id: string): Promise<void> {
  await (await db()).delete('captures', id);
}
