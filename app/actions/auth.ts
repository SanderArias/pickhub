'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/services/supabase';
import { getAppUrl } from '@/lib/app-url';
import { normalizeAuthError } from '@/lib/normalize-auth-error';
import type { AuthErrorField } from '@/lib/normalize-auth-error';

export type AuthActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Partial<Record<AuthErrorField, string>>;
} | null;

async function buildTwitchRedirectUrl(next: string) {
  const supabase = await createServerClient();
  const host = (await headers()).get('host') ?? new URL(getAppUrl()).host;
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const redirectTo = `${protocol}://${host}/auth/callback?next=${encodeURIComponent(next)}`;
  return { supabase, redirectTo };
}

export async function signInWithTwitch(nextOrForm?: string | FormData) {
  const next = typeof nextOrForm === 'string' ? nextOrForm
    : nextOrForm instanceof FormData ? (nextOrForm.get('next') as string) || '/inicio'
    : '/inicio';
  const { supabase, redirectTo } = await buildTwitchRedirectUrl(next);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'twitch',
    options: { redirectTo },
  });
  if (error) {
    console.error('[auth/twitch] signInWithOAuth error:', error.message);
    return;
  }
  if (data.url) redirect(data.url);
}

export async function linkTwitchAccount() {
  const { supabase, redirectTo } = await buildTwitchRedirectUrl('/settings');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'twitch',
    options: { redirectTo },
  });
  if (error) {
    console.error('[auth/twitch] linkTwitchAccount error:', error.message);
    return;
  }
  if (data.url) redirect(data.url);
}

export async function signInWithEmail(_prev: unknown, formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const next = (formData.get('next') as string) || '/inicio';

  const fieldErrors: Partial<Record<AuthErrorField, string>> = {};

  if (!email) fieldErrors.email = 'Ingresa tu correo electrónico.';
  if (!password) fieldErrors.password = 'Ingresa tu contraseña.';

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const normalized = normalizeAuthError(error);
    return {
      success: false,
      message: normalized.message,
      fieldErrors: normalized.field ? { [normalized.field]: normalized.message } : undefined,
    };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function signUpWithEmail(_prev: unknown, formData: FormData): Promise<AuthActionResult> {
  const username = (formData.get('username') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const next = (formData.get('next') as string) || '/inicio';

  const fieldErrors: Partial<Record<AuthErrorField, string>> = {};

  if (!username) {
    fieldErrors.general = 'El nombre de usuario es obligatorio.';
  } else {
    if (username.length < 3) fieldErrors.general = 'El nombre debe tener al menos 3 caracteres.';
    if (username.length > 30) fieldErrors.general = 'El nombre debe tener máximo 30 caracteres.';
    if (!/^[a-zA-Z0-9_\- ]+$/.test(username)) {
      fieldErrors.general = 'Solo se permiten letras, números, espacios, guiones y guiones bajos.';
    }
  }

  if (!email) fieldErrors.email = 'Ingresa tu correo electrónico.';
  if (!password) fieldErrors.password = 'Ingresa una contraseña.';
  if (!confirmPassword) fieldErrors.confirmPassword = 'Confirma tu contraseña.';

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  if (password.length < 8) {
    return { success: false, fieldErrors: { password: 'La contraseña debe tener al menos 8 caracteres.' } };
  }

  if (password !== confirmPassword) {
    return { success: false, fieldErrors: { confirmPassword: 'Las contraseñas no coinciden.' } };
  }

  const host = (await headers()).get('host') ?? new URL(getAppUrl()).host;
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: username },
      emailRedirectTo: `${origin}/login?confirmed=1&next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    const normalized = normalizeAuthError(error);
    return {
      success: false,
      message: normalized.message,
      fieldErrors: normalized.field ? { [normalized.field]: normalized.message } : undefined,
    };
  }

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      success: false,
      fieldErrors: { email: 'Ya existe una cuenta asociada a este correo.' },
    };
  }

  if (!data.session) {
    return { success: true, message: 'Revisa tu correo para confirmar tu cuenta.' };
  }

  redirect(next);
}

export async function resetPasswordForEmail(_prev: unknown, formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim();

  if (!email) {
    return { success: false, fieldErrors: { email: 'Introduce tu correo electrónico.' } };
  }

  const appUrl = getAppUrl();

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/update-password`,
  });

  if (error) {
    const normalized = normalizeAuthError(error);
    return {
      success: false,
      message: normalized.message,
      fieldErrors: normalized.field ? { [normalized.field]: normalized.message } : undefined,
    };
  }

  return { success: true, message: 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.' };
}

export async function updatePassword(_prev: unknown, formData: FormData): Promise<AuthActionResult> {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  const fieldErrors: Partial<Record<AuthErrorField, string>> = {};

  if (!password) fieldErrors.password = 'Ingresa una contraseña.';
  if (!confirmPassword) fieldErrors.confirmPassword = 'Confirma tu contraseña.';

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  if (password.length < 8) {
    return { success: false, fieldErrors: { password: 'La contraseña debe tener al menos 8 caracteres.' } };
  }

  if (password !== confirmPassword) {
    return { success: false, fieldErrors: { confirmPassword: 'Las contraseñas no coinciden.' } };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const normalized = normalizeAuthError(error);
    return {
      success: false,
      message: normalized.message,
      fieldErrors: normalized.field ? { [normalized.field]: normalized.message } : undefined,
    };
  }

  return { success: true, message: 'Tu contraseña fue actualizada correctamente.' };
}

export async function getSession() {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser() {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
