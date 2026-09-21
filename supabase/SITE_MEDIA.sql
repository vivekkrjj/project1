-- Main college building / About photo storage
insert into storage.buckets (id,name,public)
values ('site-media','site-media',true)
on conflict (id) do update set public=true;

drop policy if exists "site media public read" on storage.objects;
drop policy if exists "site media admin insert" on storage.objects;
drop policy if exists "site media admin update" on storage.objects;
drop policy if exists "site media admin delete" on storage.objects;

create policy "site media public read" on storage.objects
for select using (bucket_id='site-media');

create policy "site media admin insert" on storage.objects
for insert to authenticated
with check (bucket_id='site-media' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "site media admin update" on storage.objects
for update to authenticated
using (bucket_id='site-media' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (bucket_id='site-media' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "site media admin delete" on storage.objects
for delete to authenticated
using (bucket_id='site-media' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
