'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { requireAdmin } from '@/lib/auth';

export async function approveCreator(profileId: string) {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error: cpErr } = await supabase
    .from('creator_profiles')
    .update({ status: 'approved' })
    .eq('profile_id', profileId);

  if (cpErr) throw new Error(`Error al aprobar: ${cpErr.message}`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single();

  if (profile && profile.role === 'user') {
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ role: 'creator' })
      .eq('id', profileId);

    if (pErr) throw new Error(`Error al actualizar rol: ${pErr.message}`);
  }

  revalidatePath('/admin');
}

export async function rejectCreator(profileId: string) {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error: cpErr } = await supabase
    .from('creator_profiles')
    .update({ status: 'rejected' })
    .eq('profile_id', profileId);

  if (cpErr) throw new Error(`Error al rechazar: ${cpErr.message}`);

  const { data: rejectProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single();

  if (rejectProfile && rejectProfile.role !== 'admin') {
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', profileId);

    if (pErr) throw new Error(`Error al actualizar rol: ${pErr.message}`);
  }

  revalidatePath('/admin');
}

export async function suspendCreator(profileId: string) {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error: cpErr } = await supabase
    .from('creator_profiles')
    .update({ status: 'suspended' })
    .eq('profile_id', profileId);

  if (cpErr) throw new Error(`Error al suspender: ${cpErr.message}`);

  const { data: suspendProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single();

  if (suspendProfile && suspendProfile.role !== 'admin') {
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', profileId);

    if (pErr) throw new Error(`Error al actualizar rol: ${pErr.message}`);
  }

  revalidatePath('/admin');
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

  const supabase = await createServerClient();
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

  const supabase = await createServerClient();
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

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('tournament_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw new Error(`Error al eliminar plantilla: ${error.message}`);

  revalidatePath('/admin/templates');
}

export async function toggleTemplate(templateId: string, isActive: boolean) {
  await requireAdmin();

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('tournament_templates')
    .update({ is_active: !isActive })
    .eq('id', templateId);

  if (error) throw new Error(`Error al cambiar estado: ${error.message}`);

  revalidatePath('/admin/templates');
}
