-- Bhumi Nursing College CMS repair
-- Run this in Supabase SQL Editor if Admin Add/Edit/Update/Delete is not working.
-- It is safe for the current CMS schema and also repairs common older schemas.


-- =========================================================
-- 9. CMS REPAIR / COMPATIBILITY
-- Safe to run on an existing installation. It adds missing
-- columns and recreates the admin/public policies required by
-- the current Admin CMS.
-- =========================================================

-- Existing installations may have been created with an older CMS schema.
alter table public.site_content add column if not exists content_key text;
alter table public.site_content add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.site_content add column if not exists updated_at timestamptz not null default now();

alter table public.site_items add column if not exists item_type text;
alter table public.site_items add column if not exists title text;
alter table public.site_items add column if not exists description text;
alter table public.site_items add column if not exists subtitle text;
alter table public.site_items add column if not exists icon text;
alter table public.site_items add column if not exists image_url text;
alter table public.site_items add column if not exists link_url text;
alter table public.site_items add column if not exists sort_order integer not null default 0;
alter table public.site_items add column if not exists is_active boolean not null default true;
alter table public.site_items add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.site_items add column if not exists created_at timestamptz not null default now();
alter table public.site_items add column if not exists updated_at timestamptz not null default now();

alter table public.notices add column if not exists title text;
alter table public.notices add column if not exists details text;
alter table public.notices add column if not exists category text default 'Notice';
alter table public.notices add column if not exists is_new boolean not null default false;
alter table public.notices add column if not exists published_at timestamptz not null default now();

alter table public.faculty add column if not exists name text;
alter table public.faculty add column if not exists role text;
alter table public.faculty add column if not exists department text;
alter table public.faculty add column if not exists created_at timestamptz not null default now();

-- Re-enable RLS and make the current CMS policies deterministic.
alter table public.site_content enable row level security;
alter table public.site_items enable row level security;
alter table public.notices enable row level security;
alter table public.faculty enable row level security;

drop policy if exists "public can read site content" on public.site_content;
drop policy if exists "admins manage site content" on public.site_content;
create policy "public can read site content"
on public.site_content for select using (true);
create policy "admins manage site content"
on public.site_content for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

drop policy if exists "public can read active site items" on public.site_items;
drop policy if exists "admins manage site items" on public.site_items;
create policy "public can read active site items"
on public.site_items for select using (is_active=true);
create policy "admins manage site items"
on public.site_items for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

drop policy if exists "public can read notices" on public.notices;
drop policy if exists "admins manage notices" on public.notices;
create policy "public can read notices"
on public.notices for select using (true);
create policy "admins manage notices"
on public.notices for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

drop policy if exists "authenticated can read faculty" on public.faculty;
drop policy if exists "public can read faculty" on public.faculty;
drop policy if exists "admins manage faculty" on public.faculty;
create policy "authenticated can read faculty"
on public.faculty for select to authenticated using (true);
create policy "admins manage faculty"
on public.faculty for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- Gallery uploads require a public bucket plus admin-only write access.
insert into storage.buckets (id,name,public)
values ('gallery','gallery',true)
on conflict (id) do update set public=true;

drop policy if exists "public can view gallery images" on storage.objects;
drop policy if exists "admins upload gallery images" on storage.objects;
drop policy if exists "admins update gallery images" on storage.objects;
drop policy if exists "admins delete gallery images" on storage.objects;

create policy "public can view gallery images"
on storage.objects for select
using (bucket_id='gallery');

create policy "admins upload gallery images"
on storage.objects for insert to authenticated
with check (
  bucket_id='gallery'
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

create policy "admins update gallery images"
on storage.objects for update to authenticated
using (
  bucket_id='gallery'
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
)
with check (
  bucket_id='gallery'
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

create policy "admins delete gallery images"
on storage.objects for delete to authenticated
using (
  bucket_id='gallery'
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

-- Keep CMS ordering predictable.
create index if not exists site_items_type_order_idx
on public.site_items(item_type, sort_order, id);
create index if not exists notices_published_idx
on public.notices(published_at desc);
