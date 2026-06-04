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
