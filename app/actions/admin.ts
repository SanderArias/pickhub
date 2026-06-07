'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { requireAdmin } from '@/lib/auth';

export async function approveCreator(profileId: string): Promise<{ error: string | null }> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Acceso denegado.' };
  }

  const supabase = await createServerClient();

  const { data: cp, error: cpSelErr } = await supabase
    .from('creator_profiles')
    .select('id, status')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (cpSelErr) {
    return { error: `Error al buscar perfil: ${cpSelErr.message}` };
  }
  if (!cp) return { error: 'Perfil de creador no encontrado.' };
  if (cp.status !== 'pending') {
    return { error: 'Solo se puede aprobar un perfil pendiente.' };
  }

  const { data: updatedCp, error: cpErr } = await supabase
    .from('creator_profiles')
    .update({ status: 'approved', reason: null })
    .eq('id', cp.id)
    .select('id');



  if (cpErr) {
    return { error: `Error al aprobar: ${cpErr.message}` };
  }
  if (!updatedCp || updatedCp.length === 0) {
    return { error: 'No se pudo actualizar el perfil de creador (0 filas afectadas). Verifica permisos RLS.' };
  }

  const { data: profile, error: pSelErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single();

  if (pSelErr) {
    return { error: `Error al buscar perfil: ${pSelErr.message}` };
  }

  if (profile && profile.role !== 'admin') {
    const { data: updatedProfile, error: pErr } = await supabase
      .from('profiles')
      .update({ role: 'creator' })
      .eq('id', profileId)
      .select('id');



    if (pErr) {
      return { error: `Error al actualizar rol: ${pErr.message}` };
    }
    if (!updatedProfile || updatedProfile.length === 0) {
      return { error: 'No se pudo actualizar el rol (0 filas afectadas). Verifica permisos RLS.' };
    }
  }

  revalidatePath('/admin');
  return { error: null };
}

export async function rejectCreator(profileId: string, formData: FormData): Promise<{ error: string | null }> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Acceso denegado.' };
  }

  const reason = (formData.get('reason') as string)?.trim();
  if (!reason) return { error: 'El motivo de rechazo es obligatorio.' };

  const supabase = await createServerClient();

  const { data: cp } = await supabase
    .from('creator_profiles')
    .select('id, status')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!cp) return { error: 'Perfil de creador no encontrado.' };
  if (cp.status !== 'pending') return { error: 'Solo se puede rechazar un perfil pendiente.' };



  const { data: updatedCp, error: cpErr } = await supabase
    .from('creator_profiles')
    .update({ status: 'rejected', reason })
    .eq('id', cp.id)
    .select('id');



  if (cpErr) return { error: `Error al rechazar: ${cpErr.message}` };
  if (!updatedCp || updatedCp.length === 0) {
    return { error: 'No se pudo rechazar el perfil (0 filas afectadas). Verifica permisos RLS.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single();

  if (profile && profile.role !== 'admin') {
    const { data: updatedProfile, error: pErr } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', profileId)
      .select('id');



    if (pErr) return { error: `Error al actualizar rol: ${pErr.message}` };
    if (!updatedProfile || updatedProfile.length === 0) {
      return { error: 'No se pudo actualizar el rol (0 filas afectadas). Verifica permisos RLS.' };
    }
  }

  revalidatePath('/admin');
  return { error: null };
}

export async function suspendCreator(profileId: string, formData: FormData): Promise<{ error: string | null }> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Acceso denegado.' };
  }

  const reason = (formData.get('reason') as string)?.trim();
  if (!reason) return { error: 'El motivo de suspensión es obligatorio.' };

  const supabase = await createServerClient();

  const { data: cp } = await supabase
    .from('creator_profiles')
    .select('id, status')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!cp) return { error: 'Perfil de creador no encontrado.' };
  if (cp.status !== 'approved') return { error: 'Solo se puede suspender un perfil aprobado.' };



  const { data: updatedCp, error: cpErr } = await supabase
    .from('creator_profiles')
    .update({ status: 'suspended', reason })
    .eq('id', cp.id)
    .select('id');



  if (cpErr) return { error: `Error al suspender: ${cpErr.message}` };
  if (!updatedCp || updatedCp.length === 0) {
    return { error: 'No se pudo suspender el perfil (0 filas afectadas). Verifica permisos RLS.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single();

  if (profile && profile.role !== 'admin') {
    const { data: updatedProfile, error: pErr } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', profileId)
      .select('id');



    if (pErr) return { error: `Error al actualizar rol: ${pErr.message}` };
    if (!updatedProfile || updatedProfile.length === 0) {
      return { error: 'No se pudo actualizar el rol (0 filas afectadas). Verifica permisos RLS.' };
    }
  }

  revalidatePath('/admin');
  return { error: null };
}

export async function reactivateCreator(profileId: string): Promise<{ error: string | null }> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Acceso denegado.' };
  }

  const supabase = await createServerClient();

  const { data: cp } = await supabase
    .from('creator_profiles')
    .select('id, status')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!cp) return { error: 'Perfil de creador no encontrado.' };
  if (cp.status !== 'suspended') return { error: 'Solo se puede reactivar un perfil suspendido.' };



  const { data: updatedCp, error: cpErr } = await supabase
    .from('creator_profiles')
    .update({ status: 'approved', reason: null })
    .eq('id', cp.id)
    .select('id');



  if (cpErr) return { error: `Error al reactivar: ${cpErr.message}` };
  if (!updatedCp || updatedCp.length === 0) {
    return { error: 'No se pudo reactivar el perfil (0 filas afectadas). Verifica permisos RLS.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single();

  if (profile && profile.role !== 'admin') {
    const { data: updatedProfile, error: pErr } = await supabase
      .from('profiles')
      .update({ role: 'creator' })
      .eq('id', profileId)
      .select('id');



    if (pErr) return { error: `Error al actualizar rol: ${pErr.message}` };
    if (!updatedProfile || updatedProfile.length === 0) {
      return { error: 'No se pudo actualizar el rol (0 filas afectadas). Verifica permisos RLS.' };
    }
  }

  revalidatePath('/admin');
  return { error: null };
}

export async function reopenCreatorRequest(profileId: string): Promise<{ error: string | null }> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Acceso denegado.' };
  }

  const supabase = await createServerClient();

  const { data: cp } = await supabase
    .from('creator_profiles')
    .select('id, status')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!cp) return { error: 'Perfil de creador no encontrado.' };
  if (cp.status !== 'rejected') return { error: 'Solo se puede reabrir un perfil rechazado.' };



  const { data: updatedCp, error: cpErr } = await supabase
    .from('creator_profiles')
    .update({ status: 'reopened', reason: null })
    .eq('id', cp.id)
    .select('id');



  if (cpErr) return { error: `Error al reabrir solicitud: ${cpErr.message}` };
  if (!updatedCp || updatedCp.length === 0) {
    return { error: 'No se pudo reabrir la solicitud (0 filas afectadas). Verifica permisos RLS.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single();

  if (profile && profile.role !== 'admin') {
    const { data: updatedProfile, error: pErr } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', profileId)
      .select('id');



    if (pErr) return { error: `Error al actualizar rol: ${pErr.message}` };
    if (!updatedProfile || updatedProfile.length === 0) {
      return { error: 'No se pudo actualizar el rol (0 filas afectadas). Verifica permisos RLS.' };
    }
  }

  revalidatePath('/admin');
  return { error: null };
}

function parseFormText(formData: FormData, key: string): string | null {
  const val = formData.get(key) as string | null;
  return val && val.trim().length > 0 ? val.trim() : null;
}

function parseFormInt(formData: FormData, key: string): number | null {
  const val = parseFormText(formData, key);
  return val ? Number(val) : null;
}

function parseFormInterval(formData: FormData, key: string): string | null {
  const raw = formData.get(key) as string | null;
  if (!raw || raw.trim().length === 0) return null;
  const cleaned = raw.trim().toLowerCase();
  const match = cleaned.match(/^(\d+)\s*(h|hour|hours|m|min|minute|minutes)?$/);
  if (!match) throw new Error(`Valor inválido para ${key}. Usa formato como "2h" o "30m".`);
  const num = parseInt(match[1], 10);
  const unit = match[2]?.[0] ?? 'h';
  return `${num} ${unit === 'm' ? 'minutes' : 'hours'}`;
}

export async function createTemplate(formData: FormData) {
  const admin = await requireAdmin();

  const name = parseFormText(formData, 'name');
  if (!name) throw new Error('El nombre es obligatorio.');

  const supabase = (await createServerClient()) as any;
  const { error } = await supabase.from('tournament_templates').insert({
    name,
    description: parseFormText(formData, 'description'),
    logo_url: parseFormText(formData, 'logo_url'),
    max_participants: parseFormInt(formData, 'max_participants'),
    pickem_close_before: parseFormInterval(formData, 'pickem_close_before'),
    created_by: admin.id,
  });

  if (error) throw new Error(`Error al crear plantilla: ${error.message}`);

  revalidatePath('/admin/templates');
}

export async function updateTemplate(templateId: string, formData: FormData) {
  await requireAdmin();

  const name = parseFormText(formData, 'name');
  if (!name) throw new Error('El nombre es obligatorio.');

  const supabase = (await createServerClient()) as any;
  const { error } = await supabase
    .from('tournament_templates')
    .update({
      name,
      description: parseFormText(formData, 'description'),
      logo_url: parseFormText(formData, 'logo_url'),
      max_participants: parseFormInt(formData, 'max_participants'),
      pickem_close_before: parseFormInterval(formData, 'pickem_close_before'),
    })
    .eq('id', templateId);

  if (error) throw new Error(`Error al actualizar plantilla: ${error.message}`);

  revalidatePath('/admin/templates');
}

export async function deleteTemplate(templateId: string) {
  await requireAdmin();

  const supabase = (await createServerClient()) as any;
  const { error } = await supabase
    .from('tournament_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw new Error(`Error al eliminar plantilla: ${error.message}`);

  revalidatePath('/admin/templates');
}

export async function toggleTemplate(templateId: string, isActive: boolean) {
  await requireAdmin();

  const supabase = (await createServerClient()) as any;
  const { error } = await supabase
    .from('tournament_templates')
    .update({ is_active: !isActive })
    .eq('id', templateId);

  if (error) throw new Error(`Error al cambiar estado: ${error.message}`);

  revalidatePath('/admin/templates');
}

export async function toggleActivity(activityId: string, enabled: boolean) {
  await requireAdmin();

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('dynamic_types')
    .update({ is_enabled: !enabled })
    .eq('id', activityId);

  if (error) throw new Error(`Error al cambiar estado: ${error.message}`);

  revalidatePath('/admin/activities');
}
