-- Student profile photo storage for Bhumi Nursing College
-- This migration creates the private student-profiles bucket and self-only storage policies.
insert into storage.buckets (id,name,public) values ('student-profiles','student-profiles',false) on conflict (id) do update set public=false;

drop policy if exists "students upload own profile photo" on storage.objects;
create policy "students upload own profile photo" on storage.objects for insert to authenticated with check (bucket_id='student-profiles' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "students read own profile photo" on storage.objects;
create policy "students read own profile photo" on storage.objects for select to authenticated using (bucket_id='student-profiles' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "students update own profile photo" on storage.objects;
create policy "students update own profile photo" on storage.objects for update to authenticated using (bucket_id='student-profiles' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='student-profiles' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "students delete own profile photo" on storage.objects;
create policy "students delete own profile photo" on storage.objects for delete to authenticated using (bucket_id='student-profiles' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Admins can view student profile photos from the Admin Student List/Profile.
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
