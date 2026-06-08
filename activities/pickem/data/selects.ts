export const PUBLIC_EVENT_COLUMNS = `
  id,
  creator_id,
  title,
  slug,
  description,
  status,
  ends_at,
  created_at,
  logo_url,
  twitch_channel,
  receipt_template
` as const;

export const CREATOR_EVENT_LIST_COLUMNS = `
  id,
  title,
  slug,
  description,
  status,
  ends_at,
  event_config,
  created_at,
  updated_at
` as const;

export const CREATOR_EVENT_DETAIL_COLUMNS = `
  id,
  creator_id,
  dynamic_type_id,
  template_id,
  title,
  slug,
  description,
  status,
  event_config,
  scoring_config,
  starts_at,
  ends_at,
  max_participants,
  is_public,
  logo_url,
  twitch_channel,
  predictions_close_timezone,
  receipt_template,
  created_at,
  updated_at
` as const;

export const PREDICTION_QUESTION_COLUMNS = `
  id,
  title,
  description,
  question_type,
  pick_type,
  max_selections,
  points_per_correct,
  sort_order,
  is_active,
  created_at,
  template_type,
  config
` as const;

export const PREDICTION_OPTION_COLUMNS = `
  id,
  question_id,
  player_id,
  label,
  sort_order
` as const;

export const EVENT_PARTICIPANT_SUMMARY_COLUMNS = `
  id,
  event_id,
  profile_id,
  status,
  created_at
` as const;

export const SUBMISSION_SUMMARY_COLUMNS = `
  id,
  status,
  submitted_at,
  event_id,
  participant_id
` as const;
