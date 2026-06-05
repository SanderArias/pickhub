-- ============================================================================
-- PickHub – Create a test user profile
-- Usage:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Replace `:user_email` with the email of an existing auth user
--   3. Run
-- ============================================================================

do $$
declare
  v_user_id uuid;
  v_email   text := ':user_email';  -- ← CHANGE THIS
begin
  if v_email = ':user_email' then
    raise notice '➜ Set v_email at the top of this script to your test user email.';
    return;
  end if;

  select id into v_user_id
  from auth.users
  where email = v_email;

  if v_user_id is null then
    raise notice '➜ No auth user found with email %', v_email;
    return;
  end if;

  -- Upsert profile
  insert into public.profiles (id, display_name, role, is_active)
  values (v_user_id, 'Test User', 'user', true)
  on conflict (id) do update
    set display_name = 'Test User',
        role         = 'user',
        is_active    = true;

  raise notice '➜ Profile created/updated for % (id: %)', v_email, v_user_id;
end;
$$;
