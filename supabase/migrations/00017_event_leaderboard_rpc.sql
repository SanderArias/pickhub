create or replace function get_event_leaderboard(p_event_id uuid)
returns table (
  rank bigint,
  profile_id uuid,
  display_name text,
  total_score bigint,
  correct_answers bigint,
  total_questions bigint
)
language sql
security definer
set search_path = public, auth
as $$
  with scores as (
    select
      ps.profile_id,
      sum(ps.correct_count)::bigint as correct_answers,
      sum(ps.total_points)::bigint as total_score
    from prediction_scores ps
    where ps.event_id = p_event_id
    group by ps.profile_id
  ),
  question_count as (
    select count(*)::bigint as total
    from prediction_questions
    where event_id = p_event_id and is_active = true
  )
  select
    row_number() over (order by s.total_score desc)::bigint as rank,
    s.profile_id,
    p.display_name,
    s.total_score,
    s.correct_answers,
    qc.total as total_questions
  from scores s
  left join profiles p on p.id = s.profile_id
  cross join question_count qc
  order by s.total_score desc;
$$;

grant execute on function get_event_leaderboard to authenticated;
