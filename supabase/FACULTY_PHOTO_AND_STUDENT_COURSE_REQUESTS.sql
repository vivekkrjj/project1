-- Bhumi Nursing College: Faculty photos + course-wise student registration management
alter table public.faculty add column if not exists photo_path text;

insert into storage.buckets (id,name,public) values ('faculty-profiles','faculty-profiles',false) on conflict (id) do update set public=false;

drop policy if exists "authenticated can read faculty photos" on storage.objects;
create policy "authenticated can read faculty photos" on storage.objects for select to authenticated using (bucket_id='faculty-profiles');

drop policy if exists "admins manage faculty photos" on storage.objects;
create policy "admins manage faculty photos" on storage.objects for all to authenticated
using (bucket_id='faculty-profiles' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (bucket_id='faculty-profiles' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create index if not exists faculty_photo_idx on public.faculty(photo_path);
create index if not exists student_registration_course_idx on public.student_registration_requests(course);
create index if not exists student_registration_name_idx on public.student_registration_requests(full_name);

-- Public site media for the college building / About photo
insert into storage.buckets (id,name,public)
values ('site-media','site-media',true)
on conflict (id) do update set public=true;

drop policy if exists "site media public read" on storage.objects;
drop policy if exists "site media admin insert" on storage.objects;
drop policy if exists "site media admin update" on storage.objects;
drop policy if exists "site media admin delete" on storage.objects;
create policy "site media public read" on storage.objects for select using (bucket_id='site-media');
create policy "site media admin insert" on storage.objects for insert to authenticated with check (bucket_id='site-media' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "site media admin update" on storage.objects for update to authenticated using (bucket_id='site-media' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check (bucket_id='site-media' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "site media admin delete" on storage.objects for delete to authenticated using (bucket_id='site-media' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
