import { requireAdmin } from '@/lib/auth';
import { getAdminUsers } from '@/app/actions/admin';
import { AdminUsersPageClient } from './AdminUsersPageClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  await requireAdmin();

  const initial = await getAdminUsers(1, 20, '');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Usuarios</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Todos los usuarios registrados en PickHub.
        </p>
      </div>

      <AdminUsersPageClient initial={initial} />
    </div>
  );
}
