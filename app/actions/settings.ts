'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/db/admin';
import { encryptSecret, decryptSecret, maskSecret } from '@/lib/config/crypto';
import { getCurrentRep } from '@/lib/db/queries';
import type { ServiceName } from '@/lib/config/getServiceKey';

export type KeyStatus = { masked: string } | { missing: true };

const SERVICES: ServiceName[] = ['anthropic', 'groq', 'enrichment', 'hubspot'];

export async function getKeyStatuses(): Promise<Record<ServiceName, KeyStatus>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('app_settings')
    .select('key_name, key_ciphertext')
    .in('key_name', SERVICES);

  const result = {} as Record<ServiceName, KeyStatus>;
  for (const svc of SERVICES) {
    const row = (data ?? []).find((r: { key_name: string }) => r.key_name === svc);
    if (row?.key_ciphertext) {
      try {
        const plain = decryptSecret(row.key_ciphertext as string);
        result[svc] = { masked: maskSecret(plain) };
      } catch {
        result[svc] = { missing: true };
      }
    } else {
      result[svc] = { missing: true };
    }
  }
  return result;
}

export async function saveServiceKey(
  name: ServiceName,
  rawKey: string,
): Promise<{ success: true; masked: string } | { error: string }> {
  if (!SERVICES.includes(name)) return { error: 'Unknown service' };
  if (!rawKey.trim()) return { error: 'Key cannot be empty' };

  const rep = await getCurrentRep();
  if (!rep) return { error: 'Not authenticated' };

  try {
    const encrypted = encryptSecret(rawKey.trim());
    const admin = createAdminClient();

    const { error } = await admin.from('app_settings').upsert(
      {
        team_id: rep.teamId,
        key_name: name,
        key_ciphertext: encrypted,
        updated_by: rep.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,key_name' },
    );

    if (error) return { error: error.message };
    revalidatePath('/settings');
    return { success: true, masked: maskSecret(rawKey.trim()) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to save key' };
  }
}
