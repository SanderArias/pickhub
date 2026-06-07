'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/services/supabase';
import { getAppUrl } from '@/lib/app-url';

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
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'twitch',
    options: { redirectTo },
  });
  if (data.url) redirect(data.url);
}

export async function linkTwitchAccount() {
  const { supabase, redirectTo } = await buildTwitchRedirectUrl('/settings');
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'twitch',
    options: { redirectTo },
  });
  if (data.url) redirect(data.url);
}

export async function signInWithEmail(_prev: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const next = (formData.get('next') as string) || '/inicio';

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios.' };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function signUpWithEmail(_prev: unknown, formData: FormData) {
  const username = formData.get('username') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const next = (formData.get('next') as string) || '/inicio';

  if (!email || !password || !username) {
    return { error: 'Todos los campos son obligatorios.' };
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden.' };
  }

  const host = (await headers()).get('host') ?? new URL(getAppUrl()).host;
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${origin}/login?confirmed=1&next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'El email ya está registrado.' };
    }
    return { error: error.message };
  }

  if (!data.session) {
    return { success: 'Revisa tu correo para confirmar tu cuenta.' };
  }

  redirect(next);
}

export async function resetPasswordForEmail(_prev: unknown, formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Introduce tu correo electrónico.' };
  }

  const host = (await headers()).get('host') ?? new URL(getAppUrl()).host;
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Te enviamos un enlace para restablecer tu contraseña.' };
}

export async function updatePassword(_prev: unknown, formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden.' };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Contraseña actualizada correctamente.' };
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
