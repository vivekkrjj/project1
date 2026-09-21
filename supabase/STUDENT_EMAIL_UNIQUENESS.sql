-- Prevent duplicate student registrations by email.
-- Existing duplicate test rows: keep an approved row when possible.
with ranked as (
  select id,row_number() over (partition by lower(trim(email)) order by (status='approved') desc,created_at desc,id desc) rn
  from public.student_registration_requests
)
delete from public.student_registration_requests r using ranked x where r.id=x.id and x.rn>1;
create unique index if not exists student_registration_requests_email_unique on public.student_registration_requests (lower(trim(email)));
