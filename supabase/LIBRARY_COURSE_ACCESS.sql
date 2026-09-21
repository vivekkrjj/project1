-- Course-isolated student library access
-- Students see only their approved course + common All Nursing resources.
-- Admins retain full management/read access. Anonymous users see nothing.

alter table public.library_materials enable row level security;
drop policy if exists "public can read active library materials" on public.library_materials;
drop policy if exists "students can read their course library materials" on public.library_materials;
drop policy if exists "admins can read all library materials" on public.library_materials;

create policy "students can read their course library materials"
on public.library_materials for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.student_registration_requests r
    where r.user_id = (select auth.uid())
      and r.status = 'approved'
      and r.course = library_materials.course
  )
  or (
    is_active = true
    and library_materials.course = 'All Nursing'
    and exists (
      select 1
      from public.student_registration_requests r
      where r.user_id = (select auth.uid())
        and r.status = 'approved'
    )
  )
);

create policy "admins can read all library materials"
on public.library_materials for select
to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

create index if not exists student_registration_course_status_user_idx
on public.student_registration_requests(user_id,status,course);

-- Keep admin insert/update/delete policy from the original library migration.
