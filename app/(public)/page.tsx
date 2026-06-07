import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';

export default async function Home() {
  const user = await getUser();

  if (user) {
    console.log('[auth-redirect]', { source: 'root', pathname: '/', hasUser: true, userId: user.id, redirectTarget: '/inicio', reason: 'authenticated-on-root' });
    console.log('[auth-location]', { source: 'root', from: '/', to: '/inicio' });
    redirect('/inicio');
  }

  console.log('[auth-redirect]', { source: 'root', pathname: '/', hasUser: false, userId: null, redirectTarget: '/login', reason: 'unauthenticated-on-root' });
  console.log('[auth-location]', { source: 'root', from: '/', to: '/login' });
  redirect('/login');
}
