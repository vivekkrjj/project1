alter table public.student_registration_requests add column if not exists photo_path text;

drop policy if exists "students can update own photo path" on public.student_registration_requests;
create policy "students can update own photo path"
on public.student_registration_requests
for update to authenticated
using (auth.uid()=user_id)
with check (auth.uid()=user_id);

create index if not exists student_registration_requests_photo_idx on public.student_registration_requests(photo_path);

-- Allow the Admin panel to use all student lifecycle statuses.
alter table public.student_registration_requests drop constraint if exists student_registration_requests_status_check;
alter table public.student_registration_requests add constraint student_registration_requests_status_check
check (status = any (array['pending'::text,'approved'::text,'rejected'::text,'banned'::text]));
