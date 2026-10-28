-- Tables, statuses and row-level security for the 3D model pipeline.
--
-- Who does what:
--   anon, regular users  read published models and their route lines; users run their own captures
--   the moderator         (profiles.is_moderator, set by hand) reviews models and draws route lines
--   the team PC worker    uses the service key, which bypasses RLS, to process captures
--
-- Every table starts with no privileges for anon and authenticated; each grant below is deliberate.

-- Statuses

create type public.capture_status as enum ('uploading', 'uploaded', 'processing', 'processed', 'failed');
create type public.model_status as enum ('needs_review', 'published', 'rejected');

-- Profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_moderator boolean not null default false,
  created_at timestamptz not null default now()
);

-- Every new account gets a profile, never a moderator one.
create function public.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger create_profile after insert on auth.users
  for each row execute function public.create_profile();

-- Accounts made before this migration.
insert into public.profiles (id) select id from auth.users on conflict do nothing;

-- Security definer so policies can call it without a profiles policy of their own.
create function public.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_moderator from public.profiles where id = (select auth.uid())), false);
$$;

-- True for requests from the app, false for the service key and the SQL editor, which skip the checks below.
create function public.is_app_request() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'role'), '') in ('anon', 'authenticated');
$$;

-- Captures: the job queue

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  -- OpenBeta area uuid of the wall.
  wall_uuid uuid not null,
  captured_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  photo_count integer not null default 0 check (photo_count >= 0),
  status public.capture_status not null default 'uploading',
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'failed' or failure_reason is null)
);

create index captures_queue on public.captures (created_at) where status = 'uploaded';
create index captures_by_user on public.captures (captured_by, created_at desc);

-- Wall models: one row per immutable model version

create table public.wall_models (
  id uuid primary key default gen_random_uuid(),
  wall_uuid uuid not null,
  version integer not null check (version > 0),
  -- Path inside the review bucket, and inside models once published.
  glb_path text not null,
  -- Supabase's free plan caps a file at 50 MB.
  bytes bigint not null check (bytes > 0 and bytes <= 52428800),
  triangles integer check (triangles > 0),
  source_capture uuid references public.captures (id) on delete set null,
  status public.model_status not null default 'needs_review',
  review_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (wall_uuid, version),
  check (glb_path = wall_uuid::text || '/v' || version || '.glb'),
  check (status = 'needs_review' or reviewed_at is not null)
);

create index wall_models_published on public.wall_models (wall_uuid, version desc) where status = 'published';

-- Route lines: drawn on one model version, because every reconstruction has its own coordinates

create table public.route_lines (
  id uuid primary key default gen_random_uuid(),
  wall_model_id uuid not null references public.wall_models (id) on delete cascade,
  -- OpenBeta climb uuid.
  climb_uuid uuid not null,
  name text not null,
  grade text,
  -- Points placed on the rock from the start upward, and the surface normal at each, as [[x, y, z], ...].
  -- The viewer drapes the line between them.
  points jsonb not null,
  normals jsonb not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wall_model_id, climb_uuid),
  check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) >= 2),
  check (jsonb_typeof(normals) = 'array' and jsonb_array_length(normals) = jsonb_array_length(points))
);

-- Rules RLS can't express

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_updated_at before update on public.captures
  for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.route_lines
  for each row execute function public.touch_updated_at();

-- Review status moves needs_review → published or rejected, once, and is stamped with who and when.
-- Publishing needs the file in the public models bucket first.
create function public.check_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if public.is_app_request() and old.status <> 'needs_review' then
      raise exception 'a % model can''t change status', old.status;
    end if;
  end if;
  if (tg_op = 'INSERT' or new.status is distinct from old.status) and new.status <> 'needs_review' then
    if public.is_app_request() then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    else
      new.reviewed_at := coalesce(new.reviewed_at, now());
    end if;
    if new.status = 'published'
      and not exists (select 1 from storage.objects where bucket_id = 'models' and name = new.glb_path) then
      raise exception 'copy % to the models bucket before publishing it', new.glb_path;
    end if;
  end if;
  return new;
end;
$$;

create trigger check_review before insert or update on public.wall_models
  for each row execute function public.check_review();

-- Row-level security

alter table public.profiles enable row level security;
alter table public.captures enable row level security;
alter table public.wall_models enable row level security;
alter table public.route_lines enable row level security;

revoke all on public.profiles, public.captures, public.wall_models, public.route_lines from anon, authenticated;

-- Profiles: read your own; the moderator reads all. Nobody writes through the API, so is_moderator
-- can only be changed in SQL.
grant select on public.profiles to authenticated;
create policy "read own profile, or all as moderator" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_moderator()));

-- Captures: users create and fill their own while uploading, then mark them uploaded. Everything past
-- that, including failure_reason, is the worker's. The moderator reads all of them and can delete junk.
grant select, delete on public.captures to authenticated;
grant insert (wall_uuid, photo_count) on public.captures to authenticated;
grant update (photo_count, status) on public.captures to authenticated;

create policy "read own captures, or all as moderator" on public.captures for select to authenticated
  using (captured_by = (select auth.uid()) or (select public.is_moderator()));
create policy "start own capture" on public.captures for insert to authenticated
  with check (captured_by = (select auth.uid()) and status = 'uploading');
create policy "finish uploading own capture" on public.captures for update to authenticated
  using (captured_by = (select auth.uid()) and status = 'uploading')
  with check (captured_by = (select auth.uid()) and status in ('uploading', 'uploaded'));
create policy "cancel own capture while uploading" on public.captures for delete to authenticated
  using (captured_by = (select auth.uid()) and status = 'uploading');
create policy "moderator deletes captures" on public.captures for delete to authenticated
  using ((select public.is_moderator()));

-- Wall models: anyone reads published ones; the moderator reads all, reviews, adds (for the seed),
-- and deletes unpublished ones. Only the review columns can change, so a version's file never does.
grant select on public.wall_models to anon, authenticated;
grant insert (wall_uuid, version, glb_path, bytes, triangles, source_capture, status, review_note)
  on public.wall_models to authenticated;
grant update (status, review_note) on public.wall_models to authenticated;
grant delete on public.wall_models to authenticated;

create policy "read published models, or all as moderator" on public.wall_models for select to anon, authenticated
  using (status = 'published' or (select public.is_moderator()));
create policy "moderator adds models" on public.wall_models for insert to authenticated
  with check ((select public.is_moderator()));
create policy "moderator reviews models" on public.wall_models for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));
create policy "moderator deletes unpublished models" on public.wall_models for delete to authenticated
  using ((select public.is_moderator()) and status <> 'published');

-- Route lines: anyone reads the lines of published models; only the moderator reads the rest or writes.
grant select on public.route_lines to anon, authenticated;
grant insert (wall_model_id, climb_uuid, name, grade, points, normals) on public.route_lines to authenticated;
grant update (name, grade, points, normals) on public.route_lines to authenticated;
grant delete on public.route_lines to authenticated;

create policy "read lines of published models, or all as moderator" on public.route_lines for select
  to anon, authenticated
  using (
    (select public.is_moderator())
    or exists (select 1 from public.wall_models m where m.id = wall_model_id and m.status = 'published')
  );
create policy "moderator writes lines" on public.route_lines for all to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

-- Policies call these as the requesting role, so they need execute even on projects that don't grant it
-- by default ("Automatically expose new tables" off).
grant execute on function public.is_moderator, public.is_app_request to anon, authenticated;

-- Trigger functions aren't for calling directly.
revoke execute on function public.create_profile, public.check_review, public.touch_updated_at
  from public, anon, authenticated;
