'use server';

import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';
import { revalidatePath } from 'next/cache';

export async function devSetRole(_prev: unknown, formData: FormData): Promise<{ error: string | null }> {
  if (process.env.NODE_ENV !== 'development') {
    return { error: 'Solo disponible en desarrollo.' };
  }

  const role = formData.get('role') as string;
  if (!['user', 'creator', 'admin'].includes(role)) {
    return { error: 'Rol inválido.' };
  }

  const user = await getUser();
  if (!user) return { error: 'No autenticado.' };

  const supabase = await createServerClient();

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id);

  if (updateErr) return { error: `Error: ${updateErr.message}` };

  revalidatePath('/dev/users');
  return { error: null };
}
