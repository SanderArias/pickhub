-- 00056_add_get_admin_users_rpc.sql
-- SECURITY DEFINER RPC for admin users list.
-- Validates admin role, joins profiles + auth.users, supports search + pagination.

create or replace function public.get_admin_users(
  p_page integer default 1,
  p_page_size integer default 20,
  p_search text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = 'public, auth'
as $$
declare
  v_admin_id uuid;
  v_admin_role text;
  v_offset integer;
  v_result jsonb;
begin
  -- 1. Validate caller is admin
  v_admin_id := auth.uid();
  select role into v_admin_role from public.profiles where id = v_admin_id;
  if v_admin_role is distinct from 'admin' then
    raise exception 'Acceso denegado: se requiere rol de administrador.';
  end if;

  v_offset := (p_page - 1) * p_page_size;

  -- 2. Build result with total count + page
  select jsonb_build_object(
    'totalCount', count(*)::integer,
    'users', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', sub.id,
        'displayName', sub.display_name,
        'email', sub.email,
        'avatarUrl', sub.avatar_url,
        'twitchUsername', sub.twitch_username,
        'role', sub.role,
        'isActive', sub.is_active,
        'createdAt', sub.created_at
      )
      order by sub.created_at desc
    ) filter (where sub.row_num between v_offset + 1 and v_offset + p_page_size), '[]'::jsonb)
  ) into v_result
  from (
    select
      p.*,
      u.email,
      row_number() over (order by p.created_at desc) as row_num
    from public.profiles p
    left join auth.users u on u.id = p.id
    where (
      p_search = ''
      or p.display_name ilike '%' || p_search || '%'
      or u.email ilike '%' || p_search || '%'
      or p.twitch_username ilike '%' || p_search || '%'
    )
  ) sub;

  return v_result;
end;
$$;

grant execute on function public.get_admin_users(integer, integer, text) to authenticated;

notify pgrst, 'reload schema';
