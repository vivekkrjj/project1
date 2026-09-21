-- Admin access for student profile photos
create policy "admins can read student profile photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'student-profiles'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);
