alter table profiles
  add column if not exists twitch_username text,
  add column if not exists twitch_id text,
  add column if not exists twitch_avatar_url text;

-- Add a function to sync Twitch data from auth metadata into the profile.
-- Can be called directly when we detect a Twitch-linked auth session.
create or replace function sync_twitch_from_auth(profile_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  _user auth.users;
  _twitch_name text;
begin
  select * into _user from auth.users where id = profile_id;
  if not found then return; end if;

  -- Only sync if Twitch is the provider or among providers
  if (_user.raw_app_meta_data ->> 'provider') = 'twitch'
     or (_user.raw_app_meta_data -> 'providers') ? 'twitch'
  then
    _twitch_name := coalesce(
      _user.raw_user_meta_data ->> 'preferred_username',
      _user.raw_user_meta_data ->> 'user_name',
      _user.raw_user_meta_data ->> 'name',
      _user.raw_user_meta_data ->> 'full_name'
    );

    update profiles
    set
      display_name = coalesce(profiles.display_name, _twitch_name),
      twitch_username = _twitch_name,
      twitch_id = coalesce(
        _user.raw_user_meta_data ->> 'provider_id',
        _user.raw_user_meta_data ->> 'sub',
        profiles.twitch_id
      ),
      twitch_avatar_url = coalesce(
        _user.raw_user_meta_data ->> 'avatar_url',
        _user.raw_user_meta_data ->> 'picture',
        profiles.twitch_avatar_url
      ),
      avatar_url = coalesce(
        _user.raw_user_meta_data ->> 'avatar_url',
        _user.raw_user_meta_data ->> 'picture',
        profiles.avatar_url
      )
    where id = profile_id;
  end if;
end;
$$;
