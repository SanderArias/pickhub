'use server';

import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';
import { revalidatePath } from 'next/cache';

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
  creator: { display_name: string | null; handle: string | null } | null;
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
  tier: string;
  label: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  quantity: number;
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
  mySubmission: Submission | null;
  error: string | null;
}

export async function getPublicPickem(slug: string): Promise<PublicPickemResult> {
  const supabase = await createServerClient();
  const user = await getUser();

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .in('status', ['open', 'predictions_closed', 'completed', 'archived'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!event) {
    return { event: null, players: [], predictions: [], prizes: [], mySubmission: null, error: 'Pick\'em no encontrado.' };
  }

  if (event.status === 'draft') {
    return { event: null, players: [], predictions: [], prizes: [], mySubmission: null, error: 'Este Pick\'em todavía no está disponible.' };
  }

  let creatorInfo: { display_name: string | null; handle: string | null } | null = null;
  let players: EventPlayer[] = [];
  let predictions: PredictionQuestion[] = [];
  let prizes: Prize[] = [];
  let mySubmission: Submission | null = null;

  if (user) {
    const [cpRes, playersRes, questionsRes, prizesRes] = await Promise.all([
      supabase.from('creator_profiles').select('id, profile_id, handle').eq('id', event.creator_id).maybeSingle(),
      supabase.from('event_players').select('id, name, is_active, country_code').eq('event_id', event.id).order('sort_order', { ascending: true }),
      supabase.from('prediction_questions').select('*').eq('event_id', event.id).eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('event_prizes').select('*').eq('event_id', event.id).order('tier', { ascending: true }),
    ]);

    players = (playersRes.data ?? []) as EventPlayer[];
    prizes = (prizesRes.data ?? []) as Prize[];

    if (cpRes.data) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', cpRes.data.profile_id)
        .maybeSingle();

      creatorInfo = {
        display_name: profile?.display_name ?? null,
        handle: cpRes.data.handle,
      };
    }

    const questions = (questionsRes.data ?? []) as PredictionQuestion[];

    if (questions.length > 0) {
      const qIds = questions.map((q) => q.id);
      const { data: options } = await supabase
        .from('prediction_options')
        .select('*')
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
        const { data: answers } = await supabase
          .from('prediction_answers')
          .select('id, question_id, option_id, position')
          .eq('submission_id', submission.id);

        mySubmission = { ...submission, answers: answers ?? [] };
      }
    }
  }

  return {
    event: { ...event, creator: creatorInfo },
    players,
    predictions,
    prizes,
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

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .neq('status', 'draft')
    .maybeSingle();

  if (!event) return { error: 'Pick\'em no encontrado.', success: false, submissionId: null };
  if (event.status !== 'open') return { error: 'Las predicciones ya están cerradas.', success: false, submissionId: null };

  const { data: questions } = await supabase
    .from('prediction_questions')
    .select('id, question_type, max_selections, template_type')
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (!questions || questions.length === 0) {
    return { error: 'Este Pick\'em no tiene predicciones activas.', success: false, submissionId: null };
  }

  // Validate each question has a valid answer
  for (const q of questions) {
    if (q.template_type === 'top8_ordered') {
      for (let pos = 1; pos <= 8; pos++) {
        const val = formData.get(`q_${q.id}_${pos}`) as string;
        if (!val || !val.trim()) {
          return { error: 'Debes seleccionar 8 jugadores para enviar tu Top 8.', success: false, submissionId: null };
        }
      }
      // Check no duplicate players
      const selected = [];
      for (let pos = 1; pos <= 8; pos++) {
        selected.push(formData.get(`q_${q.id}_${pos}`) as string);
      }
      const unique = new Set(selected);
      if (unique.size !== 8) {
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

      if (q.question_type === 'multiple' && clean.length > q.max_selections) {
        return { error: `Máximo ${q.max_selections} selecciones por predicción.`, success: false, submissionId: null };
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
      for (let pos = 1; pos <= 8; pos++) {
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

  revalidatePath(`/pickems/${eventId}`);
  return { error: null, success: true, submissionId: submission.id };
}

export interface Participation {
  submissionId: string;
  submissionStatus: string;
  submittedAt: string | null;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventStatus: string;
  eventEndsAt: string | null;
  creatorDisplayName: string | null;
  creatorHandle: string | null;
  answersCount: number;
}

export async function getUserParticipations(filter: 'open' | 'closed' | 'all' = 'all'): Promise<Participation[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createServerClient();

  // Find the user's participant entries to scope submissions
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
    .select('id, title, slug, status, ends_at, creator_id')
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

  // Count answers per submission
  const submissionIds = submissions.map((s) => s.id);
  const answerCounts = new Map<string, number>();

  if (submissionIds.length > 0) {
    const { data: counts } = await supabase
      .from('prediction_answers')
      .select('submission_id')
      .in('submission_id', submissionIds);

    if (counts) {
      for (const a of counts) {
        answerCounts.set(a.submission_id, (answerCounts.get(a.submission_id) ?? 0) + 1);
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
      if (p.eventStatus === 'predictions_closed' || p.eventStatus === 'completed' || p.eventStatus === 'archived') return false;
      if (p.eventEndsAt && p.eventEndsAt <= now) return false;
      return true;
    });
  } else if (filter === 'closed') {
    participations = participations.filter((p) => {
      if (p.eventStatus === 'predictions_closed' || p.eventStatus === 'completed' || p.eventStatus === 'archived') return true;
      if (p.eventEndsAt && p.eventEndsAt <= now) return true;
      return false;
    });
  }

  return participations;
}

export async function getSubmissionReceipt(
  eventSlug: string,
  submissionId?: string | null,
): Promise<{
  event: PublicEventData | null;
  submission: (Submission & { answers: (Answer & { option_label?: string; player_id?: string | null })[] }) | null;
  predictions: PredictionQuestion[];
  players: EventPlayer[];
  prizes: Prize[];
  error: string | null;
}> {
  const supabase = await createServerClient();
  const user = await getUser();
  if (!user) return { event: null, submission: null, predictions: [], players: [], prizes: [], error: 'No autenticado.' };

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', eventSlug)
    .in('status', ['open', 'predictions_closed', 'completed', 'archived'])
    .maybeSingle();

  if (!event) return { event: null, submission: null, predictions: [], players: [], prizes: [], error: 'Pick\'em no encontrado.' };

  // Fetch all needed data
  const [cpRes, playersRes, questionsRes, prizesRes] = await Promise.all([
    supabase.from('creator_profiles').select('id, profile_id, handle').eq('id', event.creator_id).maybeSingle(),
    supabase.from('event_players').select('id, name, is_active, country_code').eq('event_id', event.id).order('sort_order', { ascending: true }),
    supabase.from('prediction_questions').select('*').eq('event_id', event.id).eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('event_prizes').select('*').eq('event_id', event.id).order('tier', { ascending: true }),
  ]);

  const players = (playersRes.data ?? []) as EventPlayer[];
  const prizes = (prizesRes.data ?? []) as Prize[];

  let creatorInfo: { display_name: string | null; handle: string | null } | null = null;
  if (cpRes.data) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', cpRes.data.profile_id)
      .maybeSingle();
    creatorInfo = {
      display_name: profile?.display_name ?? null,
      handle: cpRes.data.handle,
    };
  }

  const questions = (questionsRes.data ?? []) as PredictionQuestion[];
  let predictions: PredictionQuestion[] = [];

  if (questions.length > 0) {
    const qIds = questions.map((q) => q.id);
    const { data: options } = await supabase
      .from('prediction_options')
      .select('*')
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
