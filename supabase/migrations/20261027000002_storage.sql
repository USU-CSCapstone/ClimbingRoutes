-- Storage buckets and who can use them. The worker's service key bypasses these policies.
--
--   captures  private  photos in transit, at <user id>/<capture id>/<file>; deleted once the team PC archives them
--   review    private  unapproved models, at <wall uuid>/v<N>.glb; the moderator reads them
--   models    public   approved models, same paths; copied here by the moderator on approval
--
-- 50 MB is the free plan's per-file cap. Model versions never change, so nothing in models is updated or
-- deleted through the API.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('captures', 'captures', false, 52428800, array['image/jpeg', 'image/heic', 'image/heif']),
  ('review', 'review', false, 52428800, array['model/gltf-binary']),
  ('models', 'models', true, 52428800, array['model/gltf-binary']);

-- The capture a photo path belongs to, if it's the caller's own and still uploading.
create function public.is_own_uploading_capture(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select (storage.foldername(path))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.captures c
      where c.id::text = (storage.foldername(path))[2]
        and c.captured_by = (select auth.uid())
        and c.status = 'uploading'
    );
$$;

grant execute on function public.is_own_uploading_capture to authenticated;

-- captures: users upload into their own uploading captures, read back their own photos (to resume an
-- upload), and remove them while still uploading. Users can't overwrite photos, so retries skip ones
-- already there.
create policy "upload photos to own capture" on storage.objects for insert to authenticated
  with check (bucket_id = 'captures' and public.is_own_uploading_capture(name));
create policy "read own photos" on storage.objects for select to authenticated
  using (bucket_id = 'captures' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "remove photos from own capture" on storage.objects for delete to authenticated
  using (bucket_id = 'captures' and public.is_own_uploading_capture(name));
-- The moderator can look at and clear out any capture's photos. Removing needs read access too.
create policy "moderator reads photos" on storage.objects for select to authenticated
  using (bucket_id = 'captures' and (select public.is_moderator()));
create policy "moderator removes photos" on storage.objects for delete to authenticated
  using (bucket_id = 'captures' and (select public.is_moderator()));

-- review: the moderator only. Reading is what copying to models needs; removing frees space after a review.
create policy "moderator reads review" on storage.objects for select to authenticated
  using (bucket_id = 'review' and (select public.is_moderator()));
create policy "moderator uploads to review" on storage.objects for insert to authenticated
  with check (bucket_id = 'review' and (select public.is_moderator()));
create policy "moderator removes from review" on storage.objects for delete to authenticated
  using (bucket_id = 'review' and (select public.is_moderator()));

-- models: anyone downloads by public URL, which skips RLS. Only the moderator adds files, and only at the
-- path of a model row that exists.
create policy "moderator adds published files" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'models'
    and (select public.is_moderator())
    and exists (select 1 from public.wall_models m where m.glb_path = name)
  );
create policy "moderator lists models" on storage.objects for select to authenticated
  using (bucket_id = 'models' and (select public.is_moderator()));
