'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/services/supabase';

export async function signInWithTwitch() {
  const supabase = await createServerClient();
  const host = (await headers()).get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const redirectTo = `${protocol}://${host}/auth/callback`;

  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'twitch',
    options: {
      redirectTo,
    },
  });

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithEmail(_prev: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios.' };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect('/inicio');
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
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
