'use server';
// Server action called by the sync manager to process a queued (offline) capture.
// Reads the capture blob from IndexedDB via a data URL, uploads audio, then runs the pipeline.
// NOTE: This is a thin bridge — the heavy lifting is in lib/capture/processCapture.ts.

export async function processQueuedCapture(_captureId: string): Promise<void> {
  // TODO(voice): wire to lib/capture/processCapture once voice path is built.
  // For now the manual capture path commits directly via commitEncounter action.
  throw new Error('Voice pipeline not yet implemented — use manual capture.');
}
