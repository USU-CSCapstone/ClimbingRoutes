-- What the upload queue (#45) and the team PC scripts (scripts/captures/) need.

-- A capture's scan.json manifest goes up with its photos, and stays after the photos are deleted.
update storage.buckets
  set allowed_mime_types = array['image/jpeg', 'image/heic', 'image/heif', 'application/json']
  where id = 'captures';

-- Takes the oldest uploaded capture and marks it processing, so two pulls can't take the same one.
-- Returns no row when nothing is waiting. For the team PC's secret key only.
create function public.claim_capture() returns setof public.captures
language sql security definer set search_path = '' as $$
  update public.captures set status = 'processing'
  where id = (
    select id from public.captures
    where status = 'uploaded'
    order by created_at
    limit 1
    for update skip locked
  )
  returning *;
$$;

revoke execute on function public.claim_capture from public, anon, authenticated;
grant execute on function public.claim_capture to service_role;

-- If approving fails after the file was copied to models, the moderator can remove it again. Files of
-- published models still can't be removed, so a published version never changes.
create policy "moderator removes unpublished files from models" on storage.objects for delete to authenticated
  using (
    bucket_id = 'models'
    and (select public.is_moderator())
    and not exists (select 1 from public.wall_models m where m.glb_path = name and m.status = 'published')
  );
