'use server';

import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';
import { pickemRoutes } from '@/activities/pickem/routes';
import { revalidatePath } from 'next/cache';
import { checkPickemCapability, requirePickemCapability } from '@/activities/pickem/lib/capability-guards.server';
import {
  PUBLIC_EVENT_COLUMNS,
  PREDICTION_QUESTION_COLUMNS,
  PREDICTION_OPTION_COLUMNS,
} from '@/activities/pickem/data/selects';
import { getPrizeConfiguration } from '@/activities/pickem/prizes/actions/get-prize-configuration';
import type { PrizeAwardEntry } from '@/activities/pickem/actions/results-data';
import { perf } from '@/lib/perf';

export interface PublicEventData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  ends_at: string | null;
  created_at: string;
  logo_url: string | null;
  twitch_channel: string | null;
  receipt_template: string | null;
  creator: { display_name: string | null; handle: string | null; avatar_url: string | null } | null;
}

export interface PrizeDisplay {
  id: string;
  event_id: string;
  label: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  quantity: number;
  eligibility_type: string;
  assignment_method: string;
  eligible_rank_start: number;
  sort_order: number;
  prize_category: string | null;
}

export interface EventPlayer {
  id: string;
  name: string;
  is_active: boolean;
  country_code: string | null;
}

export interface PredictionOption {
  id: string;
  question_id: string;
  player_id: string | null;
  label: string;
  sort_order: number;
}

export interface PredictionQuestion {
  id: string;
  title: string;
  description: string | null;
  question_type: string;
  pick_type: string;
  max_selections: number;
  points_per_correct: number;
  sort_order: number;
  is_active: boolean;
  template_type: string | null;
  config: Record<string, unknown>;
  options: PredictionOption[];
}

export interface Prize {
  id: string;
  event_id: string;
  label: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  quantity: number;
  eligibility_type: string;
  assignment_method: string;
  eligible_rank_start: number;
  sort_order: number;
  prize_category: string | null;
  rankPosition: number | null;
  subscriberOrder: number | null;
}

export interface Answer {
  id: string;
  question_id: string;
  option_id: string;
  position?: number | null;
}

export interface Submission {
  id: string;
  status: string;
  submitted_at: string | null;
  answers: Answer[];
}

export interface PublicPickemResult {
  event: PublicEventData | null;
  players: EventPlayer[];
  predictions: PredictionQuestion[];
  prizes: Prize[];
  prizeConfiguration: import('@/activities/pickem/prizes/types').PrizeConfiguration;
  mySubmission: Submission | null;
  error: string | null;
}

export async function getPublicPickem(slug: string): Promise<PublicPickemResult> {
  requirePickemCapability('readHistoricalData');

  const supabase = await createServerClient();
  const user = await getUser();

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(PUBLIC_EVENT_COLUMNS)
    .eq('slug', slug)
    .in('status', ['open', 'predictions_closed', 'tiebreaker_pending', 'completed', 'archived'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.error('[pickem:public] query error', { slug, code: eventError.code, message: eventError.message });
    return { event: null, players: [], predictions: [], prizes: [], prizeConfiguration: { settings: { stackingPolicy: 'allow_both' }, generalPrizes: [], subscriberBenefits: [] }, mySubmission: null, error: 'Error al cargar el Pick\'em.' };
  }

  if (!event) {
    return { event: null, players: [], predictions: [], prizes: [], prizeConfiguration: { settings: { stackingPolicy: 'allow_both' }, generalPrizes: [], subscriberBenefits: [] }, mySubmission: null, error: 'Pick\'em no encontrado.' };
  }

  if (event.status === 'draft') {
    return { event: null, players: [], predictions: [], prizes: [], prizeConfiguration: { settings: { stackingPolicy: 'allow_both' }, generalPrizes: [], subscriberBenefits: [] }, mySubmission: null, error: 'Este Pick\'em todavía no está disponible.' };
  }

  if (event.status === 'open' && event.ends_at && new Date(event.ends_at) <= new Date()) {
    const { error: closeErr } = await (supabase as any)
      .from('events')
      .update({ status: 'predictions_closed' })
      .eq('id', event.id)
      .eq('status', 'open');
    if (!closeErr) {
      event.status = 'predictions_closed';
      console.log('[pickem:auto-close] opportunistic close', { eventId: event.id, closeAt: event.ends_at });
    }
  }

  let creatorInfo: { display_name: string | null; handle: string | null; avatar_url: string | null } | null = null;
  let players: EventPlayer[] = [];
  let predictions: PredictionQuestion[] = [];
  let prizes: Prize[] = [];
  let mySubmission: Submission | null = null;

  // Load prize configuration from new architecture
  const prizeConfig = await getPrizeConfiguration(event.id);
  prizes = [] as Prize[];

  if (user) {
    const [cpRes, playersRes, questionsRes] = await Promise.all([
      supabase.from('creator_profiles').select('id, profile_id, handle').eq('id', event.creator_id).maybeSingle(),
      supabase.from('event_players').select('id, name, is_active, country_code').eq('event_id', event.id).order('sort_order', { ascending: true }),
      supabase.from('prediction_questions').select(PREDICTION_QUESTION_COLUMNS).eq('event_id', event.id).eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    ]);

    players = (playersRes.data ?? []) as EventPlayer[];

    if (cpRes.data) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', cpRes.data.profile_id)
        .maybeSingle();

      creatorInfo = {
        display_name: profile?.display_name ?? null,
        handle: cpRes.data.handle,
        avatar_url: profile?.avatar_url ?? null,
      };
    }

    const questions = (questionsRes.data ?? []) as unknown as PredictionQuestion[];

    if (questions.length > 0) {
      const qIds = questions.map((q) => q.id);
      const { data: options } = await supabase
        .from('prediction_options')
        .select(PREDICTION_OPTION_COLUMNS)
        .in('question_id', qIds)
        .order('sort_order', { ascending: true });

      predictions = questions.map((q) => ({
        ...q,
        options: (options ?? []).filter((o: PredictionOption) => o.question_id === q.id),
      }));
    }

    const { data: participant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', event.id)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (participant) {
      const { data: submission } = await supabase
        .from('submissions')
        .select('id, status, submitted_at')
        .eq('event_id', event.id)
        .eq('participant_id', participant.id)
        .maybeSingle();

      if (submission) {
        const { data: answers, error: ansErr } = await supabase
          .from('prediction_answers')
          .select('id, question_id, option_id, position')
          .eq('submission_id', submission.id);

        if (ansErr) {
          console.error('[pickem:receipt] error loading prediction_answers', {
            submissionId: submission.id,
            code: ansErr.code,
            message: ansErr.message,
          });
          mySubmission = { ...submission, answers: [] };
        } else {
          mySubmission = { ...submission, answers: answers ?? [] };
        }
      }
    }
  }

  return {
    event: { ...event, creator: creatorInfo },
    players,
    predictions,
    prizes,
    prizeConfiguration: prizeConfig,
    mySubmission,
    error: null,
  };
}

export async function submitPredictions(
  eventId: string,
  _prev: { error: string | null; success: boolean; submissionId: string | null },
  formData: FormData,
): Promise<{ error: string | null; success: boolean; submissionId: string | null }> {
  const user = await getUser();
  if (!user) return { error: 'Debes iniciar sesión para participar.', success: false, submissionId: null };

  const partErr = checkPickemCapability('participate');
  if (partErr) return { error: partErr, success: false, submissionId: null };

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, slug, status, creator_id, ends_at')
    .eq('id', eventId)
    .neq('status', 'draft')
    .maybeSingle();

  if (!event) return { error: 'Pick\'em no encontrado.', success: false, submissionId: null };
  if (event.status !== 'open') return { error: 'Las predicciones ya están cerradas.', success: false, submissionId: null };

  if (event.ends_at && new Date(event.ends_at) <= new Date()) {
    await supabase
      .from('events')
      .update({ status: 'predictions_closed' })
      .eq('id', eventId)
      .eq('status', 'open');
    return { error: 'Las predicciones de este Pick\'em ya cerraron.', success: false, submissionId: null };
  }

  const { data: questions } = await supabase
    .from('prediction_questions')
    .select('id, question_type, max_selections, template_type, config')
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (!questions || questions.length === 0) {
    return { error: 'Este Pick\'em no tiene predicciones activas.', success: false, submissionId: null };
  }

  // Validate each question has a valid answer
  for (const q of questions) {
    if (q.template_type === 'top8_ordered') {
      const selectionLimit = (q.config as Record<string, unknown>)?.positions as number ?? q.max_selections ?? 8;
      for (let pos = 1; pos <= selectionLimit; pos++) {
        const val = formData.get(`q_${q.id}_${pos}`) as string;
        if (!val || !val.trim()) {
          return { error: `Debes seleccionar ${selectionLimit} jugadores para enviar tu Top 8.`, success: false, submissionId: null };
        }
      }
      // Check no duplicate players
      const selected = [];
      for (let pos = 1; pos <= selectionLimit; pos++) {
        selected.push(formData.get(`q_${q.id}_${pos}`) as string);
      }
      const unique = new Set(selected);
      if (unique.size !== selectionLimit) {
        return { error: 'No puedes seleccionar el mismo jugador en más de una posición.', success: false, submissionId: null };
      }
    } else {
      const values = formData.getAll(`q_${q.id}`) as string[];
      const clean = values.filter((v) => v.trim().length > 0);

      if (clean.length === 0) {
        return { error: `Debes responder todas las predicciones.`, success: false, submissionId: null };
      }

      if (q.question_type === 'single' && clean.length > 1) {
        return { error: `Selecciona solo una opción por predicción.`, success: false, submissionId: null };
      }

      if (q.question_type === 'multiple' && clean.length > (q.max_selections ?? 1)) {
        return { error: `Máximo ${q.max_selections ?? 1} selecciones por predicción.`, success: false, submissionId: null };
      }
    }
  }

  // Ensure event_participant exists
  let participantId: string;

  const { data: existing } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (existing) {
    participantId = existing.id;
  } else {
    const { data: newParticipant, error: insertErr } = await supabase
      .from('event_participants')
      .insert({ event_id: eventId, profile_id: user.id })
      .select('id')
      .single();

    if (insertErr || !newParticipant) {
      return { error: `Error al registrarte en el evento: ${insertErr?.message}`, success: false, submissionId: null };
    }
    participantId = newParticipant.id;
  }

  // Subscriber verification for creators with active sub verification
  if (event.creator_id) {
    try {
      const { data: creatorConn } = await supabase
        .from('creator_twitch_connections')
        .select('twitch_user_id, access_token_encrypted, refresh_token_encrypted, expires_at')
        .eq('profile_id', event.creator_id)
        .eq('subscriber_verification_enabled', true)
        .is('revoked_at', null)
        .maybeSingle();

      if (creatorConn) {
        const participantProfile = await supabase
          .from('profiles')
          .select('twitch_id')
          .eq('id', user.id)
          .maybeSingle();

        const participantTwitchId = (participantProfile?.data as any)?.twitch_id;

        if (participantTwitchId) {
          const { decrypt } = await import('@/lib/twitch-crypto');
          const { checkSubscription, refreshAccessToken } = await import('@/lib/twitch-api');

          let accessToken = decrypt(creatorConn.access_token_encrypted);

          if (creatorConn.expires_at && new Date(creatorConn.expires_at) < new Date()) {
            if (creatorConn.refresh_token_encrypted) {
              const refreshToken = decrypt(creatorConn.refresh_token_encrypted);
              const refreshed = await refreshAccessToken(refreshToken);
              accessToken = refreshed.access_token;
              const newEncrypted = (await import('@/lib/twitch-crypto')).encrypt(accessToken);
              await supabase
                .from('creator_twitch_connections')
                .update({
                  access_token_encrypted: newEncrypted,
                  refresh_token_encrypted: refreshed.refresh_token
                    ? (await import('@/lib/twitch-crypto')).encrypt(refreshed.refresh_token)
                    : undefined,
                  expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
                })
                .eq('profile_id', event.creator_id);
            }
          }

          const subResult = await checkSubscription(accessToken, creatorConn.twitch_user_id, participantTwitchId);

          await supabase
            .from('event_participants')
            .update({
              is_subscriber: subResult.is_subscriber,
              subscriber_verified_at: new Date().toISOString(),
              subscription_tier: subResult.tier,
              subscription_source: 'twitch',
              subscriber_verification_status: subResult.is_subscriber ? 'verified_sub' : 'verified_non_sub',
            })
            .eq('id', participantId);
        } else {
          await supabase
            .from('event_participants')
            .update({
              subscriber_verification_status: 'unavailable',
            })
            .eq('id', participantId);
        }
      }
    } catch {
      await supabase
        .from('event_participants')
        .update({
          subscriber_verification_status: 'failed',
        })
        .eq('id', participantId);
    }
  }

  // Check for existing submission
  const { data: existingSubmission } = await supabase
    .from('submissions')
    .select('id')
    .eq('event_id', eventId)
    .eq('participant_id', participantId)
    .maybeSingle();

  if (existingSubmission) {
    return { error: 'Ya has enviado tu participación para este Pick\'em.', success: false, submissionId: null };
  }

  // Create submission
  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .insert({
      event_id: eventId,
      participant_id: participantId,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (subErr || !submission) {
    return { error: `Error al enviar: ${subErr?.message}`, success: false, submissionId: null };
  }

  // Create prediction_answers
  const answers: { submission_id: string; question_id: string; option_id: string; position?: number }[] = [];

  for (const q of questions) {
    if (q.template_type === 'top8_ordered') {
      const selectionLimit = (q.config as Record<string, unknown>)?.positions as number ?? q.max_selections ?? 8;
      for (let pos = 1; pos <= selectionLimit; pos++) {
        const optionId = formData.get(`q_${q.id}_${pos}`) as string;
        answers.push({
          submission_id: submission.id,
          question_id: q.id,
          option_id: optionId,
          position: pos,
        });
      }
    } else {
      const values = formData.getAll(`q_${q.id}`) as string[];
      const clean = values.filter((v) => v.trim().length > 0);

      for (const optionId of clean) {
        answers.push({
          submission_id: submission.id,
          question_id: q.id,
          option_id: optionId,
        });
      }
    }
  }

  const { error: ansErr } = await supabase
    .from('prediction_answers')
    .insert(answers);

  if (ansErr) {
    return { error: `Error al guardar respuestas: ${ansErr?.message}`, success: false, submissionId: null };
  }

  revalidatePath(pickemRoutes.public.detail(event.slug));
  return { error: null, success: true, submissionId: submission.id };
}

export interface Participation {
  submissionId: string;
  submissionStatus: string;
  submittedAt: string | null;
  eventId: string;
  eventTitle: string;
  eventDescription: string | null;
  eventSlug: string;
  eventStatus: string;
  eventEndsAt: string | null;
  creatorDisplayName: string | null;
  creatorHandle: string | null;
  answersCount: number;
}

export async function getUserParticipations(
  filter: 'open' | 'closed' | 'all' = 'all',
  existingUser?: Awaited<ReturnType<typeof getUser>> | null,
): Promise<Participation[]> {
  return perf.measure('[performance:dashboard:events]', async () => {
    requirePickemCapability('readHistoricalData');

    const user = existingUser ?? (await getUser());
    if (!user) return [];

    const supabase = await createServerClient();

    const { data: participants } = await supabase
      .from('event_participants')
      .select('id')
      .eq('profile_id', user.id);

    if (!participants || participants.length === 0) return [];

    const participantIds = participants.map((p) => p.id);

    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, status, submitted_at, event_id')
      .in('participant_id', participantIds)
      .order('submitted_at', { ascending: false });

    if (!submissions || submissions.length === 0) return [];

    const eventIds = [...new Set(submissions.map((s) => s.event_id))];

    const { data: events } = await supabase
      .from('events')
      .select('id, title, slug, description, status, ends_at, creator_id')
      .in('id', eventIds);

    if (!events) return [];

    const creatorIds = [...new Set(events.map((e) => e.creator_id).filter(Boolean))];
    const creatorMap = new Map<string, { handle: string | null; display_name: string | null }>();

    if (creatorIds.length > 0) {
      const { data: cps } = await supabase
        .from('creator_profiles')
        .select('id, handle, profile_id')
        .in('id', creatorIds);

      if (cps) {
        const profileIds = cps.map((cp) => cp.profile_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', profileIds);

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

        for (const cp of cps) {
          creatorMap.set(cp.id, {
            handle: cp.handle,
            display_name: profileMap.get(cp.profile_id) ?? null,
          });
        }
      }
    }

    const eventMap = new Map(
      events.map((e) => [
        e.id,
        {
          ...e,
          creator: creatorMap.get(e.creator_id) ?? { handle: null, display_name: null },
        },
      ]),
    );

    const submissionIds = submissions.map((s) => s.id);
    const answerCounts = new Map<string, number>();

    if (submissionIds.length > 0) {
      const { data: counts, error: cntErr } = await supabase
        .from('submissions')
        .select('id, answer_count:prediction_answers(count)')
        .in('id', submissionIds);

      if (cntErr) {
        console.error('[pickem:participations] error counting prediction_answers', {
          code: cntErr.code,
          message: cntErr.message,
        });
      } else if (counts) {
        for (const row of counts) {
          const answers = (row as any).answer_count as Array<{ count: number }> | undefined;
          if (answers && answers.length > 0) {
            answerCounts.set(row.id, answers[0].count);
          }
        }
      }
    }

    const now = new Date().toISOString();

    let participations: Participation[] = [];

    for (const s of submissions) {
      const event = eventMap.get(s.event_id);
      if (!event) continue;

      participations.push({
        submissionId: s.id,
        submissionStatus: s.status,
        submittedAt: s.submitted_at,
        eventId: event.id,
        eventTitle: event.title,
        eventDescription: (event as any).description ?? null,
        eventSlug: event.slug,
        eventStatus: event.status,
        eventEndsAt: event.ends_at,
        creatorDisplayName: event.creator.display_name,
        creatorHandle: event.creator.handle,
        answersCount: answerCounts.get(s.id) ?? 0,
      });
    }

    if (filter === 'open') {
      participations = participations.filter((p) => {
        if (p.eventStatus === 'predictions_closed' || p.eventStatus === 'tiebreaker_pending' || p.eventStatus === 'completed' || p.eventStatus === 'archived') return false;
        if (p.eventEndsAt && p.eventEndsAt <= now) return false;
        return true;
      });
    } else if (filter === 'closed') {
      participations = participations.filter((p) => {
        if (p.eventStatus === 'predictions_closed' || p.eventStatus === 'tiebreaker_pending' || p.eventStatus === 'completed' || p.eventStatus === 'archived') return true;
        if (p.eventEndsAt && p.eventEndsAt <= now) return true;
        return false;
      });
    }

    return participations;
  });
}

export async function getSubmissionReceipt(
  eventSlug: string,
  submissionId?: string | null,
): Promise<{
  event: PublicEventData | null;
  submission: (Submission & { answers: (Answer & { option_label?: string; player_id?: string | null })[] }) | null;
  predictions: PredictionQuestion[];
  players: EventPlayer[];
  prizes: PrizeDisplay[];
  error: string | null;
}> {
  requirePickemCapability('readHistoricalData');

  const supabase = await createServerClient();
  const user = await getUser();
  if (!user) return { event: null, submission: null, predictions: [], players: [], prizes: [], error: 'No autenticado.' };

  const { data: event } = await supabase
    .from('events')
    .select(PUBLIC_EVENT_COLUMNS)
    .eq('slug', eventSlug)
    .in('status', ['open', 'predictions_closed', 'tiebreaker_pending', 'completed', 'archived'])
    .maybeSingle();

  if (!event) return { event: null, submission: null, predictions: [], players: [], prizes: [], error: 'Pick\'em no encontrado.' };

  // Fetch all needed data
  const prizeConfig = await getPrizeConfiguration(event.id);
  const [cpRes, playersRes, questionsRes] = await Promise.all([
    supabase.from('creator_profiles').select('id, profile_id, handle').eq('id', event.creator_id).maybeSingle(),
    supabase.from('event_players').select('id, name, is_active, country_code').eq('event_id', event.id).order('sort_order', { ascending: true }),
    supabase.from('prediction_questions').select(PREDICTION_QUESTION_COLUMNS).eq('event_id', event.id).eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
  ]);

  const players = (playersRes.data ?? []) as EventPlayer[];
  const prizes: PrizeDisplay[] = [
    ...prizeConfig.generalPrizes.map((d) => ({
      id: d.id,
      event_id: event.id,
      label: d.title,
      description: d.description,
      amount: null as number | null,
      currency: null as string | null,
      quantity: 1,
      eligibility_type: 'all' as const,
      assignment_method: 'ranking' as const,
      eligible_rank_start: d.rankPosition ?? 1,
      sort_order: d.sortOrder,
      prize_category: 'general_ranking' as const,
    })),
    ...prizeConfig.subscriberBenefits.map((d) => ({
      id: d.id,
      event_id: event.id,
      label: d.title,
      description: d.description,
      amount: null as number | null,
      currency: null as string | null,
      quantity: 1,
      eligibility_type: 'subscribers' as const,
      assignment_method: 'ranking' as const,
      eligible_rank_start: d.subscriberOrder ?? 1,
      sort_order: d.sortOrder,
      prize_category: 'subscriber_bonus' as const,
    })),
  ];

  let creatorInfo: { display_name: string | null; handle: string | null; avatar_url: string | null } | null = null;
  if (cpRes.data) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', cpRes.data.profile_id)
      .maybeSingle();
    creatorInfo = {
      display_name: profile?.display_name ?? null,
      handle: cpRes.data.handle,
      avatar_url: null,
    };
  }

  const questions = (questionsRes.data ?? []) as unknown as PredictionQuestion[];
  let predictions: PredictionQuestion[] = [];

  if (questions.length > 0) {
    const qIds = questions.map((q) => q.id);
    const { data: options } = await supabase
      .from('prediction_options')
      .select(PREDICTION_OPTION_COLUMNS)
      .in('question_id', qIds)
      .order('sort_order', { ascending: true });

    predictions = questions.map((q) => ({
      ...q,
      options: (options ?? []).filter((o: PredictionOption) => o.question_id === q.id),
    }));
  }

  // Get submission
  let submissionData;
  if (submissionId) {
    const { data: s } = await supabase
      .from('submissions')
      .select('id, status, submitted_at')
      .eq('id', submissionId)
      .eq('event_id', event.id)
      .maybeSingle();
    submissionData = s;
  } else {
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', event.id)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (participant) {
      const { data: s } = await supabase
        .from('submissions')
        .select('id, status, submitted_at')
        .eq('event_id', event.id)
        .eq('participant_id', participant.id)
        .maybeSingle();
      submissionData = s;
    }
  }

  if (!submissionData) return { event: null, submission: null, predictions: [], players: [], prizes: [], error: 'Participación no encontrada.' };

  const { data: answers } = await supabase
    .from('prediction_answers')
    .select('id, question_id, option_id, position')
    .eq('submission_id', submissionData.id);

  // Enrich answers with option labels
  const optionIds = (answers ?? []).map((a) => a.option_id);
  const { data: optionData } = await supabase
    .from('prediction_options')
    .select('id, label, player_id')
    .in('id', optionIds);

  const optionMap = new Map((optionData ?? []).map((o) => [o.id, { label: o.label, player_id: o.player_id }]));

  const enrichedAnswers = (answers ?? []).map((a) => ({
    ...a,
    option_label: optionMap.get(a.option_id)?.label ?? '—',
    player_id: optionMap.get(a.option_id)?.player_id ?? null,
  }));

  return {
    event: { ...event, creator: creatorInfo },
    submission: { ...submissionData, answers: enrichedAnswers },
    predictions,
    players,
    prizes,
    error: null,
  };
}

export interface OfficialResultRow {
  position: number;
  player_name: string;
  country_code: string | null;
  seed: number | null;
  image_url: string | null;
}

export async function getParticipantOfficialResults(eventId: string): Promise<OfficialResultRow[]> {
  requirePickemCapability('readHistoricalData');

  const supabase = await createServerClient();

  const { data: players } = await supabase
    .from('event_players')
    .select('name, country_code, seed, image_url')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('seed', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  return (players ?? []).map((p, i) => ({
    position: i + 1,
    player_name: p.name,
    country_code: p.country_code,
    seed: p.seed,
    image_url: p.image_url,
  }));
}

/* ------------------------------------------------------------------ */
/*  Participant result view model                                      */
/* ------------------------------------------------------------------ */

export type ParticipantResultStatus = 'pending' | 'provisional' | 'tiebreaker_pending' | 'finalized';

export type ParticipantPrizeStatus = 'available' | 'pending_assignment' | 'won' | 'not_won' | 'on_hold_tiebreaker' | 'unassigned_no_eligible_winner' | 'assigned_to_other';

export interface ParticipantPrizeViewModel {
  definitionId: string;
  category: string;
  label: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  status: ParticipantPrizeStatus;
  winnerName: string | null;
}

export interface ParticipantResultViewModel {
  result: {
    rank: number | null;
    sharedRank: number | null;
    total_score: number | null;
    correct_answers: number;
    total_questions: number;
    resultStatus: ParticipantResultStatus;
    isFinalWinner: boolean;
  };
  prizes: ParticipantPrizeViewModel[];
  allAwards: Array<{
    profileId: string;
    prizeLabel: string;
    amount: number | null;
    currency: string | null;
  }>;
  prizeAwards: PrizeAwardEntry[];
}

/**
 * Loads the participant's result summary for the given event and profile.
 * Combines prize definitions + awards + leaderboard data into a single view model.
 */
export async function getParticipantResultSummary(
  eventId: string,
  profileId: string,
): Promise<ParticipantResultViewModel> {
  requirePickemCapability('readHistoricalData');

  const supabase = await createServerClient();

  // 1. Prize definitions via getPrizeConfiguration (security-definer RPC, bypasses RLS and schema-cache issues)
  const prizeConfig = await getPrizeConfiguration(eventId);
  const prizeDefSource = [
    ...prizeConfig.generalPrizes,
    ...prizeConfig.subscriberBenefits,
  ];
  const prizeDefs = prizeDefSource.map((d: any) => ({
    id: d.id,
    category: d.category,
    title: d.title,
    description: d.description,
    amount: d.amount,
    currency: d.currency,
    rank_position: d.rankPosition,
    subscriber_order: d.subscriberOrder,
    sort_order: d.sortOrder,
  }));

  // 2. Prize awards via SECURITY DEFINER RPC (bypasses RLS)
  const defIds: string[] = prizeDefs.map((p: any) => p.id);
  let myAwardDefIds = new Set<string>();
  let noEligibleWinnerDefIds = new Set<string>();
  let awardWinnerMap = new Map<string, string | null>();
  let rawAllAwards: Array<{
    prize_definition_id: string;
    profile_id: string | null;
    assignment_status: string;
    awarded_rank: number | null;
    subscriber_rank: number | null;
  }> = [];

  if (defIds.length > 0) {
    const { data: rpcAwards, error: rpcErr } = await (supabase.rpc as any)(
      'get_pickem_prize_awards',
      { p_event_id: eventId },
    );
    console.info('[pickem:participant-awards-read]', {
      eventId,
      count: Array.isArray(rpcAwards) ? rpcAwards.length : 0,
      error: rpcErr
        ? { code: rpcErr.code, message: rpcErr.message }
        : null,
    });
    if (rpcErr) {
      console.error('[pickem:participant-awards] RPC error', { eventId, code: rpcErr.code, message: rpcErr.message });
    }
    rawAllAwards = Array.isArray(rpcAwards) ? rpcAwards : [];

    for (const a of rawAllAwards as Array<{ prize_definition_id: string; profile_id: string | null; assignment_status: string }>) {
      if (a.profile_id === profileId && a.assignment_status === 'assigned') {
        myAwardDefIds.add(a.prize_definition_id);
      }
      if (a.assignment_status === 'assigned' && a.profile_id) {
        if (!awardWinnerMap.has(a.prize_definition_id)) {
          awardWinnerMap.set(a.prize_definition_id, a.profile_id);
        }
      }
      if (a.assignment_status === 'unassigned_no_eligible_winner') {
        noEligibleWinnerDefIds.add(a.prize_definition_id);
      }
    }
  }

  // 3. Leaderboard + score
  const { data: lb } = await supabase.rpc('get_event_leaderboard', { p_event_id: eventId });
  let leaderboard = (lb ?? []) as Array<{
    rank: number;
    profile_id: string;
    display_name: string | null;
    total_score: number;
    correct_answers: number;
    total_questions: number;
  }>;

  // Apply draw reordering matching getLeaderboard() logic
  const { data: draws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  const drawMap = new Map((draws ?? []).map((d) => [d.profile_id, d.draw_order]));
  if (draws && draws.length > 0) {
    const byScore = new Map<number, typeof leaderboard>();
    for (const e of leaderboard) {
      const g = byScore.get(e.total_score) ?? [];
      g.push(e);
      byScore.set(e.total_score, g);
    }
    const reordered: typeof leaderboard = [];
    for (const score of [...byScore.keys()].sort((a, b) => b - a)) {
      const group = byScore.get(score)!;
      const hasDraws = group.some((e) => drawMap.has(e.profile_id));
      if (hasDraws) {
        group.sort((a, b) => (drawMap.get(a.profile_id) ?? 999) - (drawMap.get(b.profile_id) ?? 999));
      }
      reordered.push(...group);
    }
    reordered.forEach((e, i) => { e.rank = i + 1; });
    leaderboard = reordered;
  }

  const myEntry = leaderboard.find((e) => e.profile_id === profileId) ?? null;

  // 4. Event status
  const { data: event } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .maybeSingle();

  const eventStatus = event?.status ?? 'unknown';

  const drawProfileIds = new Set((draws ?? []).map((d) => d.profile_id));

  // 5. Build score groups from the leaderboard and detect ties
  //    Group ALL entries by total_score to find ties regardless of RPC row_number
  const scoreGroups = new Map<number, { profileIds: string[]; ranks: number[] }>();
  for (const e of leaderboard) {
    const group = scoreGroups.get(e.total_score) ?? { profileIds: [], ranks: [] };
    group.profileIds.push(e.profile_id);
    group.ranks.push(e.rank);
    scoreGroups.set(e.total_score, group);
  }

  // Determine if a score group affects prizes by checking prize definitions
  const affectedPrizeRanks = new Set<number>();
  let hasSubscriberBenefits = false;
  for (const d of prizeDefs ?? []) {
    if (d.category === 'general_rank' && d.rank_position != null) {
      affectedPrizeRanks.add(d.rank_position);
    }
    if (d.category === 'subscriber_benefit' && d.subscriber_order != null) {
      hasSubscriberBenefits = true;
    }
  }

  // Find the participant's tie group (if any)
  let participantTieGroup: {
    score: number;
    profileIds: string[];
    tiedAtRank: number;
    affectedRanks: number[];
    requiresManualTiebreaker: boolean;
  } | null = null;

  if (myEntry) {
    for (const [score, group] of scoreGroups) {
      if (group.profileIds.length < 2) continue;
      if (!group.profileIds.includes(myEntry.profile_id)) continue;

      const tiedAtRank = Math.min(...group.ranks);
      const affectedRanks: number[] = [];
      for (let i = 0; i < group.profileIds.length; i++) {
        affectedRanks.push(tiedAtRank + i);
      }

      const affectsGeneral = affectedRanks.some((r) => affectedPrizeRanks.has(r));
      const affectsSubBenefit = hasSubscriberBenefits && group.profileIds.some(
        (pid) => leaderboard.find((e) => e.profile_id === pid),
      );
      const requiresManual = affectsGeneral || affectsSubBenefit;

      participantTieGroup = {
        score,
        profileIds: group.profileIds,
        tiedAtRank,
        affectedRanks,
        requiresManualTiebreaker: requiresManual,
      };
      break;
    }
  }

  const isInPendingManualTie =
    participantTieGroup !== null &&
    participantTieGroup.requiresManualTiebreaker &&
    !participantTieGroup.profileIds.every((pid) => drawProfileIds.has(pid));

  // sharedRank is only meaningful when the tie is still unresolved
  const sharedRank =
    (isInPendingManualTie || (eventStatus === 'tiebreaker_pending' && participantTieGroup !== null))
      ? participantTieGroup!.tiedAtRank
      : null;

  // 7. Determine result status
  let resultStatus: ParticipantResultStatus;
  let isFinalWinner = false;

  if (isInPendingManualTie) {
    resultStatus = 'tiebreaker_pending';
  } else if (eventStatus === 'tiebreaker_pending' && participantTieGroup !== null) {
    // Event is in tiebreaker state and this participant IS in a tie group
    resultStatus = 'tiebreaker_pending';
  } else if (eventStatus === 'completed') {
    resultStatus = 'finalized';
    if (myEntry && myEntry.rank === 1 && participantTieGroup === null) {
      isFinalWinner = true;
    }
  } else if (eventStatus === 'tiebreaker_pending') {
    resultStatus = 'finalized';
  } else if (myEntry) {
    resultStatus = 'provisional';
  } else {
    resultStatus = 'pending';
  }

  // 8. Build prize view models
  interface ParticipantResultViewModelResult {
    rank: number | null;
    sharedRank: number | null;
    total_score: number | null;
    correct_answers: number;
    total_questions: number;
    resultStatus: ParticipantResultStatus;
    isFinalWinner: boolean;
  }
  interface ParticipantPrizeViewModelPrize extends ParticipantPrizeViewModel {} // eslint-disable-line

  const result: ParticipantResultViewModelResult = {
    rank: isInPendingManualTie ? null : myEntry?.rank ?? null,
    sharedRank,
    total_score: myEntry?.total_score ?? null,
    correct_answers: myEntry?.correct_answers ?? 0,
    total_questions: myEntry?.total_questions ?? 0,
    resultStatus,
    isFinalWinner,
  };

  const isEventCompleted = eventStatus === 'completed' || eventStatus === 'tiebreaker_pending';

  // Load profile names for award winners
  const winnerProfileIds = [...new Set(awardWinnerMap.values())].filter((id): id is string => id != null);
  const { data: winnerProfiles } = winnerProfileIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', winnerProfileIds)
    : { data: [] };
  const winnerNameMap = new Map((winnerProfiles ?? []).map((p: any) => [p.id, p.display_name]));

  // Determine per-definition blocking to avoid globally marking all as on_hold
  const defBlockedByPendingTie = new Set<string>();
  if (!isInPendingManualTie && participantTieGroup) {
    // Even after draws exist, check if this participant's definitions are
    // blocked by a group that hasn't been finalized to completed yet
  }
  if (isInPendingManualTie) {
    // All definitions are blocked
    const allDefIds = (prizeDefs ?? []).map((p: any) => p.id);
    for (const id of allDefIds) defBlockedByPendingTie.add(id);
  }

  const prizes: ParticipantPrizeViewModel[] = (prizeDefs ?? []).map((d: any) => {
    const isGeneral = d.category === 'general_rank';
    let status: ParticipantPrizeStatus;

    if (myAwardDefIds.has(d.id)) {
      status = 'won';
    } else if (noEligibleWinnerDefIds.has(d.id)) {
      status = 'unassigned_no_eligible_winner';
    } else if (eventStatus === 'completed') {
      if (awardWinnerMap.has(d.id)) {
        status = 'assigned_to_other';
      } else {
        status = 'not_won';
      }
    } else if (defBlockedByPendingTie.has(d.id) || isInPendingManualTie) {
      status = 'on_hold_tiebreaker';
    } else {
      status = 'available';
    }

    const winnerId = awardWinnerMap.get(d.id) ?? null;
    const winnerName = winnerId && winnerId !== profileId
      ? (winnerNameMap.get(winnerId) ?? null)
      : null;

    return {
      definitionId: d.id,
      category: isGeneral ? 'general_ranking' : 'subscriber_bonus',
      label: d.title,
      description: d.description,
      amount: d.amount,
      currency: d.currency,
      status,
      winnerName,
    };
  });

  // Build prizeAwards (PrizeAwardEntry[]) mirroring getCompletedSummary logic
  const awardByDefId = new Map(rawAllAwards.map((a) => [a.prize_definition_id, a]));
  const isEffectivelyCompleted = eventStatus === 'completed';
  const isTiebreakerPendingState = eventStatus === 'tiebreaker_pending';
  const prizeAwards: PrizeAwardEntry[] = (prizeDefs ?? []).map((d: any) => {
    const award = awardByDefId.get(d.id);
    const isGeneral = d.category === 'general_rank';
    if (!award || award.assignment_status === 'pending') {
      return {
        prize_id: d.id,
        prize_label: d.title ?? 'Premio',
        prize_amount: d.amount ?? null,
        prize_currency: d.currency ?? null,
        prize_category: isGeneral ? 'general_ranking' : 'subscriber_bonus',
        prize_quantity: 1,
        eligibility_type: isGeneral ? 'all' : 'subscribers',
        profile_id: null,
        display_name: null,
        rank_achieved: null,
        award_status: (isTiebreakerPendingState ? 'blocked_by_tiebreaker' : 'unassigned') as 'blocked_by_tiebreaker' | 'unassigned',
      } satisfies PrizeAwardEntry;
    }
    if (award.assignment_status === 'revoked' || award.assignment_status === 'unassigned_no_eligible_winner') {
      return {
        prize_id: d.id,
        prize_label: d.title ?? 'Premio',
        prize_amount: d.amount ?? null,
        prize_currency: d.currency ?? null,
        prize_category: isGeneral ? 'general_ranking' : 'subscriber_bonus',
        prize_quantity: 1,
        eligibility_type: isGeneral ? 'all' : 'subscribers',
        profile_id: null,
        display_name: null,
        rank_achieved: null,
        award_status: 'unassigned_no_eligible_winner' as const,
      } satisfies PrizeAwardEntry;
    }
    const winnerName = award.profile_id ? (winnerNameMap.get(award.profile_id) ?? null) : null;
    return {
      prize_id: d.id,
      prize_label: d.title ?? 'Premio',
      prize_amount: d.amount ?? null,
      prize_currency: d.currency ?? null,
      prize_category: isGeneral ? 'general_ranking' : 'subscriber_bonus',
      prize_quantity: 1,
      eligibility_type: isGeneral ? 'all' : 'subscribers',
      profile_id: award.profile_id,
      display_name: winnerName,
      rank_achieved: award.awarded_rank ?? award.subscriber_rank ?? null,
      award_status: (isTiebreakerPendingState ? 'blocked_by_tiebreaker' : 'assigned') as 'blocked_by_tiebreaker' | 'assigned',
    } satisfies PrizeAwardEntry;
  });

  // Build full award list for ranking tab (all participants' assigned prizes)
  const defInfoMap = new Map<string, { title: string; amount: number | null; currency: string | null }>(
    (prizeDefs ?? []).map((d: any) => [d.id, { title: d.title ?? 'Premio', amount: d.amount ?? null, currency: d.currency ?? null }])
  );
  const allAwards: ParticipantResultViewModel['allAwards'] = rawAllAwards
    .filter((a) => a.assignment_status === 'assigned' && a.profile_id)
    .map((a) => {
      const info = defInfoMap.get(a.prize_definition_id);
      return {
        profileId: a.profile_id!,
        prizeLabel: info?.title ?? 'Premio',
        amount: info?.amount ?? null,
        currency: info?.currency ?? null,
      };
    });

  return { result, prizes, allAwards, prizeAwards };
}
