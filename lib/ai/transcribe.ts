// Speech-to-text (Whisper). AI SDK v6: experimental_transcribe + openai.transcription model.
import 'server-only';
import { experimental_transcribe as transcribe } from 'ai';
import { whisperModel } from '@/lib/ai/models';

export async function transcribeAudio(audio: Uint8Array): Promise<string> {
  const model = await whisperModel();
  const result = await transcribe({ model, audio });
  return result.text;
}
