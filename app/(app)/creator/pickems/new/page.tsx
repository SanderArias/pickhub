import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/auth';
import { isActivityCapabilityEnabled } from '@/activities/registry.server';
import { createPickem } from '@/activities/pickem/actions';
import { PageHeader, ActionButton } from '@/components/ui';
import { ClosureSection } from './ClosureSection';
import { DescriptionField } from './DescriptionField';

export default async function NewPickemPage() {
  await requireCreator();

  if (!isActivityCapabilityEnabled('pickem', 'create')) {
    redirect('/creator/pickems?notice=creation_disabled');
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Crear Pick'em"
        backHref="/creator/pickems"
        backLabel="Mis Pick'ems"
      />

      <form action={createPickem} className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Ej. Predicciones ESL Pro League"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>

        <DescriptionField />

        <ClosureSection />

        <ActionButton type="submit" variant="primary">
          Crear Pick’em
        </ActionButton>
      </form>
    </div>
  );
}
