// AES-256-GCM encryption for service keys stored in app_settings.
// Keys are decrypted ONLY server-side (getServiceKey) and never sent to the client.
// See plans/tech/00-tech-foundation.md §6.
import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

function key(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_SECRET;
  if (!secret) throw new Error('Missing SETTINGS_ENCRYPTION_SECRET (infra env var).');
  return scryptSync(secret, 'lanyard-settings', 32); // deterministic 32-byte key
}

/** Returns base64 of  iv(12) | authTag(16) | ciphertext . */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** Mask a secret for display in Settings UI, e.g. "sk-ant…9Yx2". */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 8) return '••••';
  return `${plaintext.slice(0, 4)}…${plaintext.slice(-4)}`;
}
