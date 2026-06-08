-- 00057_fix_get_admin_users_rpc.sql
-- Replaces get_admin_users with a CTE-based query that sources from auth.users
-- (LEFT JOIN profiles) so all Authentication users appear, even without a profile.
-- Fixes alias-scoping bug from 00056 where `p.` was referenced outside its scope.

create or replace function public.get_admin_users(
  p_page integer default 1,
  p_page_size integer default 20,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'public, auth'
as $$
declare
  v_admin_role text;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Acceso denegado: se requiere rol de administrador.';
  end if;

  return (
    with filtered as (
      select
        u.id,
        u.email,
        u.created_at,
        u.last_sign_in_at,
        u.email_confirmed_at,
        u.raw_app_meta_data ->> 'provider' as provider,
        p.display_name,
        p.avatar_url,
        p.twitch_username,
        coalesce(p.role, 'user')      as role,
        coalesce(p.is_active, true)   as is_active
      from auth.users u
      left join public.profiles p on p.id = u.id
      where
        p_search is null
        or p_search = ''
        or p.display_name ilike '%' || p_search || '%'
        or p.twitch_username ilike '%' || p_search || '%'
        or u.email ilike '%' || p_search || '%'
    )
    select jsonb_build_object(
      'totalCount', (select count(*)::integer from filtered),
      'users', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',               sub.id,
              'displayName',       sub.display_name,
              'email',             sub.email,
              'avatarUrl',         sub.avatar_url,
              'twitchUsername',    sub.twitch_username,
              'role',              sub.role,
              'isActive',          sub.is_active,
              'createdAt',         sub.created_at,
              'provider',          sub.provider,
              'emailConfirmedAt',  sub.email_confirmed_at,
              'lastSignInAt',      sub.last_sign_in_at
            )
            order by sub.created_at desc
          )
          from (
            select *
            from filtered
            order by created_at desc
            limit p_page_size
            offset (p_page - 1) * p_page_size
          ) sub
        ),
        '[]'::jsonb
      )
    )
  );
end;
$$;

grant execute on function public.get_admin_users(integer, integer, text) to authenticated;

notify pgrst, 'reload schema';
