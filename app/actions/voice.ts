'use server';
import { processCapture } from '@/lib/capture/processCapture';
import type { CaptureDraft } from '@/lib/types';

export async function processVoiceCapture(
  transcript: string,
): Promise<CaptureDraft | { error: string }> {
  try {
    return await processCapture({ text: transcript, firsthand: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Processing failed';
    return { error: msg };
  }
}
