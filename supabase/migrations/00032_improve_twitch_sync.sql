-- Improved sync_twitch_from_auth that also checks auth.identities,
-- because Twitch OAuth data may live in the identities table rather
-- than directly in raw_user_meta_data.

create or replace function sync_twitch_from_auth(profile_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  _user auth.users;
  _identity auth.identities;
  _twitch_name text;
  _twitch_id_val text;
  _twitch_avatar_val text;
begin
  select * into _user from auth.users where id = profile_id;
  if not found then return; end if;

  -- Only sync if Twitch is the provider or among providers
  if (_user.raw_app_meta_data ->> 'provider') = 'twitch'
     or (_user.raw_app_meta_data -> 'providers') ? 'twitch'
  then
    -- 1. Try auth.identities first (most reliable for OAuth-derived data)
    select * into _identity
    from auth.identities
    where user_id = profile_id and provider = 'twitch';

    if found then
      _twitch_name := coalesce(
        _identity.identity_data ->> 'preferred_username',
        _identity.identity_data ->> 'user_name',
        _identity.identity_data ->> 'name',
        _identity.identity_data ->> 'full_name'
      );
      _twitch_id_val := coalesce(
        _identity.identity_data ->> 'provider_id',
        _identity.identity_data ->> 'sub',
        _identity.id::text
      );
      _twitch_avatar_val := coalesce(
        _identity.identity_data ->> 'avatar_url',
        _identity.identity_data ->> 'picture'
      );
    end if;

    -- 2. Fall back to raw_user_meta_data if identity didn't have the fields
    _twitch_name := coalesce(
      _twitch_name,
      _user.raw_user_meta_data ->> 'preferred_username',
      _user.raw_user_meta_data ->> 'user_name',
      _user.raw_user_meta_data ->> 'name',
      _user.raw_user_meta_data ->> 'full_name'
    );
    _twitch_id_val := coalesce(
      _twitch_id_val,
      _user.raw_user_meta_data ->> 'provider_id',
      _user.raw_user_meta_data ->> 'sub'
    );
    _twitch_avatar_val := coalesce(
      _twitch_avatar_val,
      _user.raw_user_meta_data ->> 'avatar_url',
      _user.raw_user_meta_data ->> 'picture'
    );

    update profiles
    set
      display_name = coalesce(profiles.display_name, _twitch_name),
      twitch_username = coalesce(_twitch_name, profiles.twitch_username),
      twitch_id = coalesce(_twitch_id_val, profiles.twitch_id),
      twitch_avatar_url = coalesce(_twitch_avatar_val, profiles.twitch_avatar_url),
      avatar_url = coalesce(_twitch_avatar_val, profiles.avatar_url)
    where id = profile_id;
  end if;
end;
$$;
