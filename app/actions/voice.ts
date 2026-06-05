'use server';
import { experimental_transcribe as transcribe } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { processCapture } from '@/lib/capture/processCapture';
import { getServiceKey, MissingServiceKeyError } from '@/lib/config/getServiceKey';
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

export async function transcribeAndProcess(
  formData: FormData,
): Promise<CaptureDraft | { error: string }> {
  try {
    const audioFile = formData.get('audio') as File | null;
    if (!audioFile || audioFile.size === 0) return { error: 'No audio received.' };

    const apiKey = await getServiceKey('groq');
    if (!apiKey) throw new MissingServiceKeyError('groq');

    const groq = createGroq({ apiKey });
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    const { text } = await transcribe({
      model: groq.transcription('whisper-large-v3-turbo'),
      audio: audioBuffer,
      providerOptions: { groq: { response_format: 'json' } },
    });

    if (!text?.trim()) return { error: 'Could not transcribe audio — please try again.' };

    return await processCapture({ text: text.trim(), firsthand: true });
  } catch (err) {
    if (err instanceof MissingServiceKeyError)
      return { error: 'Add your Groq API key in Settings to enable voice transcription.' };
    const msg = err instanceof Error ? err.message : 'Processing failed';
    return { error: msg };
  }
}
