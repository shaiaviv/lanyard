// Browser-side sync manager. Drains the IndexedDB capture queue on reconnect.
// Online path: recorded → upload → processCapture (server action) → draft → review → commit.
'use client';
import { listCaptures, updateCapture, type QueuedCapture } from '@/lib/offline/queue';

/** Call from a client component on mount and whenever navigator.onLine fires. */
export async function drainQueue(
  onProgress?: (id: string, status: string) => void,
): Promise<void> {
  if (!navigator.onLine) return;

  let items: QueuedCapture[];
  try {
    items = await listCaptures();
  } catch {
    return; // IndexedDB not available (SSR guard)
  }

  const pending = items.filter((c) => c.status === 'recorded' || c.status === 'error');

  for (const capture of pending) {
    try {
      onProgress?.(capture.id, 'uploading');
      await updateCapture(capture.id, { status: 'uploading' });

      // Dynamic import avoids bundling server-only code
      const { processQueuedCapture } = await import('@/app/actions/sync');
      await processQueuedCapture(capture.id);

      onProgress?.(capture.id, 'processing');
    } catch (err) {
      console.error('[sync] failed to process capture', capture.id, err);
      await updateCapture(capture.id, { status: 'error' }).catch(() => {});
      onProgress?.(capture.id, 'error');
    }
  }
}

/** Register window online event to auto-drain. Call once from a root client component. */
export function registerSyncListener(onProgress?: (id: string, status: string) => void): () => void {
  const handler = () => drainQueue(onProgress);
  window.addEventListener('online', handler);
  // Attempt drain immediately in case we're already online with queued items
  void drainQueue(onProgress);
  return () => window.removeEventListener('online', handler);
}
