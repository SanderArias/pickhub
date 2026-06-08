'use server';

import { createServerClient } from '@/services/supabase';
import type { PrizeConfiguration, PrizeDefinition, PrizeSettings, PrizeStackingPolicy } from '../types';

interface RawPrize {
  id: string;
  event_id: string;
  category: string;
  rank_position: number | null;
  subscriber_order: number | null;
  title: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapDef(d: RawPrize): PrizeDefinition {
  return {
    id: d.id,
    eventId: d.event_id,
    category: d.category as 'general_rank' | 'subscriber_benefit',
    rankPosition: d.rank_position,
    subscriberOrder: d.subscriber_order,
    title: d.title,
    description: d.description,
    amount: d.amount == null ? null : Number(d.amount),
    currency: d.currency ?? null,
    sortOrder: d.sort_order,
    isActive: d.is_active,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function toConfig(settingsStacking: string | undefined | null, allDefs: RawPrize[]): PrizeConfiguration {
  const settings: PrizeSettings = {
    stackingPolicy: (settingsStacking ?? 'allow_both') as PrizeStackingPolicy,
  };

  const activeDefs = allDefs.filter((d) => d.is_active);

  const generalPrizes = activeDefs
    .filter((d) => d.category === 'general_rank')
    .map(mapDef)
    .sort((a, b) => (a.rankPosition ?? 0) - (b.rankPosition ?? 0));

  const subscriberBenefits = activeDefs
    .filter((d) => d.category === 'subscriber_benefit')
    .map(mapDef)
    .sort((a, b) => (a.subscriberOrder ?? 0) - (b.subscriberOrder ?? 0));

  return { settings, generalPrizes, subscriberBenefits };
}

export async function getPrizeConfiguration(eventId: string): Promise<PrizeConfiguration> {
  const supabase = await createServerClient();
  const db = supabase as any;

  // Attempt RPC first (SECURITY DEFINER, bypasses RLS and schema-cache issues)
  const { data: rpcResult, error: rpcErr } = await (supabase.rpc as any)(
    'get_pickem_prize_configuration',
    { p_event_id: eventId },
  );

  if (!rpcErr && rpcResult) {
    const result = rpcResult as { settings?: { stacking_policy?: string }; definitions?: RawPrize[] };
    const stackingPolicy = result.settings?.stacking_policy ?? null;
    return toConfig(stackingPolicy, result.definitions ?? []);
  }

  // Fallback: direct table queries (for environments where the RPC hasn't been created yet)
  console.warn('[getPrizeConfiguration] RPC unavailable, falling back to direct query', rpcErr);

  const [settingsRes, defsRes] = await Promise.all([
    db
      .from('pickem_prize_settings')
      .select('stacking_policy')
      .eq('event_id', eventId)
      .maybeSingle(),
    db
      .from('pickem_prize_definitions')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true }),
  ]);

  const stackingPolicy = settingsRes?.data?.stacking_policy ?? null;
  const allDefs = (defsRes?.data ?? []) as RawPrize[];

  return toConfig(stackingPolicy, allDefs);
}
