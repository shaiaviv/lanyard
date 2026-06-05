'use server';
import { createAdminClient } from '@/lib/db/admin';
import { getCurrentRep } from '@/lib/db/queries';

export async function setCurrentConference(conferenceId: string | null): Promise<void> {
  const rep = await getCurrentRep();
  if (!rep) return;
  const admin = createAdminClient();
  await admin
    .from('reps')
    .update({ current_conference_id: conferenceId })
    .eq('id', rep.id);
}
