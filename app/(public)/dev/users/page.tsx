import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCurrentProfile } from '@/lib/auth';
import { DevRoleSwitcher } from './DevRoleSwitcher';

export default async function DevUsersPage() {
  if (process.env.NODE_ENV !== 'development') {
    redirect('/');
  }

  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile(user);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-lg font-bold text-text-primary">Dev: Usuarios</h1>
        <p className="text-xs text-text-muted">Panel de desarrollo — solo visible en local</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Usuario actual</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            <tr>
              <td className="py-1.5 pr-4 text-text-muted">Auth ID</td>
              <td className="py-1.5 font-mono text-xs text-text-primary">{user.id}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4 text-text-muted">Email</td>
              <td className="py-1.5 text-text-primary">{user.email ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4 text-text-muted">Role</td>
              <td className="py-1.5 font-mono text-text-primary">{profile?.role ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4 text-text-muted">is_active</td>
              <td className="py-1.5 font-mono text-text-primary">{String(profile?.is_active ?? '—')}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4 text-text-muted">display_name</td>
              <td className="py-1.5 text-text-primary">{profile?.display_name ?? '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DevRoleSwitcher currentRole={profile?.role ?? 'user'} />
    </div>
  );
}
