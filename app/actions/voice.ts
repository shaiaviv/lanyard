'use server';
import { processCapture } from '@/lib/capture/processCapture';
import type { CaptureDraft } from '@/lib/types';

export async function processVoiceCapture(
  audioBase64: string,
): Promise<CaptureDraft | { error: string }> {
  try {
    const buf = Buffer.from(audioBase64, 'base64');
    return await processCapture({ audio: new Uint8Array(buf), firsthand: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Processing failed';
    return { error: msg };
  }
}
