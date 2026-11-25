-- User profiles (#83): usernames, saved routes, climbed routes, and letting people see what became of
-- their own scans.
--
-- Who does what, on top of the first migration:
--   anon             asks whether a username is free, before signing up
--   regular users    set their own username; keep their own saved and climbed routes; read the models
--                    made from their own captures, with the reviewer's note
--
-- New accounts also need sign-up turned on in the hosted project (Authentication → Sign In / Providers →
-- Email → Allow new users to sign up). This file doesn't change that.

-- Usernames

-- Lowercase only, so two names can't differ just by case. Null for accounts made before usernames,
-- until they pick one.
alter table public.profiles add column username text;
alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$');
create unique index profiles_username on public.profiles (username);

-- Sign-up sends the username along with the email and password. One that's taken or malformed doesn't
-- stop the account being made: the profile starts without one, and the app asks again.
create or replace function public.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  wanted text := nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '');
begin
  begin
    insert into public.profiles (id, username) values (new.id, wanted);
  exception when unique_violation or check_violation then
    insert into public.profiles (id) values (new.id);
  end;
  return new;
end;
$$;

-- Security definer because nobody can read other people's profiles. It only ever answers yes or no.
create function public.username_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select name ~ '^[a-z0-9_]{3,20}$' and not exists (select 1 from public.profiles where username = name);
$$;

revoke execute on function public.username_available from public;
grant execute on function public.username_available to anon, authenticated;

-- Only the username column, so is_moderator still can't be changed through the API.
grant update (username) on public.profiles to authenticated;
create policy "set own username" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Saved routes: a route someone wants to come back to

create table public.saved_routes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- OpenBeta climb uuid, and the area uuid of the wall it's on.
  climb_uuid uuid not null,
  wall_uuid uuid not null,
  -- As they were when saved, so the list shows without asking OpenBeta about each route.
  name text not null check (char_length(name) between 1 and 200),
  grade text check (char_length(grade) <= 40),
  wall_name text not null check (char_length(wall_name) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (user_id, climb_uuid)
);

-- Climbed routes: one per route, with the day it was climbed

create table public.climbed_routes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  climb_uuid uuid not null,
  wall_uuid uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  grade text check (char_length(grade) <= 40),
  wall_name text not null check (char_length(wall_name) between 1 and 200),
  -- The day on the climber's own calendar, which the app sends: the server's day can be a day off.
  climbed_on date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, climb_uuid)
);

alter table public.saved_routes enable row level security;
alter table public.climbed_routes enable row level security;

revoke all on public.saved_routes, public.climbed_routes from anon, authenticated;

grant select, delete on public.saved_routes to authenticated;
grant insert (climb_uuid, wall_uuid, name, grade, wall_name) on public.saved_routes to authenticated;

create policy "read own saved routes" on public.saved_routes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "save a route for yourself" on public.saved_routes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "remove own saved route" on public.saved_routes for delete to authenticated
  using (user_id = (select auth.uid()));

-- The date can be corrected afterwards; nothing else changes. A day of slack covers time zones ahead
-- of the server.
grant select, delete on public.climbed_routes to authenticated;
grant insert (climb_uuid, wall_uuid, name, grade, wall_name, climbed_on) on public.climbed_routes to authenticated;
grant update (climbed_on) on public.climbed_routes to authenticated;

create policy "read own climbed routes" on public.climbed_routes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "mark a route climbed for yourself" on public.climbed_routes for insert to authenticated
  with check (user_id = (select auth.uid()) and climbed_on <= current_date + 1);
create policy "change the day of own climbed route" on public.climbed_routes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and climbed_on <= current_date + 1);
create policy "remove own climbed route" on public.climbed_routes for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.saved_routes, public.climbed_routes to service_role;

-- What became of a scan
--
-- A capture stays `processed` whatever the review decides, so its uploader couldn't tell a rejected model
-- from one still waiting. They can now read the model rows made from their own captures, in any status,
-- with the reviewer's note. The files of unpublished models stay moderator-only (storage policies), and so
-- do their route lines.
create index wall_models_source_capture on public.wall_models (source_capture);

create policy "read models made from own captures" on public.wall_models for select to authenticated
  using (
    exists (
      select 1 from public.captures c
      where c.id = source_capture and c.captured_by = (select auth.uid())
    )
  );
