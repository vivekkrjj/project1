-- Bhumi Nursing College: Course-locked MCQ tests + library PDF storage
create extension if not exists pgcrypto;

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  course text not null check (course in ('ANM','GNM','B.Sc Nursing','All Nursing')),
  year_level text,
  subject text,
  question text not null,
  options jsonb not null,
  correct_option integer not null check (correct_option >= 0 and correct_option <= 5),
  explanation text,
  marks integer not null default 1,
  is_active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quiz_questions_course_idx on public.quiz_questions(course,is_active);
create index if not exists quiz_questions_subject_idx on public.quiz_questions(subject);
alter table public.quiz_questions enable row level security;

drop policy if exists "students can read their course quiz questions" on public.quiz_questions;
create policy "students can read their course quiz questions" on public.quiz_questions
for select to authenticated using (
  is_active = true and (
    course = 'All Nursing' or exists (
      select 1 from public.student_registration_requests r
      where r.user_id=(select auth.uid()) and r.status='approved' and r.course=quiz_questions.course
    )
  )
);
drop policy if exists "admins manage quiz questions" on public.quiz_questions;
create policy "admins manage quiz questions" on public.quiz_questions
for all to authenticated using (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
) with check (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);
grant select on public.quiz_questions to authenticated;
grant insert,update,delete on public.quiz_questions to authenticated;

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  subject text,
  total_questions integer not null,
  correct_answers integer not null,
  score integer not null,
  percentage numeric(6,2) not null,
  answers jsonb,
  completed_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts(user_id,completed_at desc);
alter table public.quiz_attempts enable row level security;
drop policy if exists "students can create own quiz attempts" on public.quiz_attempts;
create policy "students can create own quiz attempts" on public.quiz_attempts for insert to authenticated
with check (user_id=(select auth.uid()) and exists(select 1 from public.student_registration_requests r where r.user_id=(select auth.uid()) and r.status='approved' and r.course=quiz_attempts.course));
drop policy if exists "students can read own quiz attempts" on public.quiz_attempts;
create policy "students can read own quiz attempts" on public.quiz_attempts for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "admins can read quiz attempts" on public.quiz_attempts;
create policy "admins can read quiz attempts" on public.quiz_attempts for select to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
grant select,insert on public.quiz_attempts to authenticated;

-- Private-ish public bucket: access is controlled by object path + authenticated/admin policies.
insert into storage.buckets (id,name,public)
values ('library-files','library-files',false)
on conflict (id) do update set public=false;

drop policy if exists "admins can upload library files" on storage.objects;
create policy "admins can upload library files" on storage.objects for insert to authenticated
with check (bucket_id='library-files' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "admins can update library files" on storage.objects;
create policy "admins can update library files" on storage.objects for update to authenticated
using (bucket_id='library-files' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (bucket_id='library-files' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "admins can delete library files" on storage.objects;
create policy "admins can delete library files" on storage.objects for delete to authenticated
using (bucket_id='library-files' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "approved students can read library files" on storage.objects;
create policy "approved students can read library files" on storage.objects for select to authenticated
using (
 bucket_id='library-files' and (
   exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
   or exists(select 1 from public.student_registration_requests r where r.user_id=(select auth.uid()) and r.status='approved')
 )
);

-- Starter MCQs (course-specific + common)
insert into public.quiz_questions(course,year_level,subject,question,options,correct_option,explanation,sort_order)
select * from (values
('All Nursing',null,'Fundamentals of Nursing','Which practice is most effective for preventing healthcare-associated infection?','["Hand hygiene","Using perfume","Keeping windows closed","Skipping PPE"]'::jsonb,0,'Hand hygiene is a core infection-prevention measure.',1),
('All Nursing',null,'Anatomy','The normal adult resting pulse rate is approximately:','["20–40/min","60–100/min","120–160/min","180–220/min"]'::jsonb,1,'A typical adult resting pulse is about 60–100 beats/minute.',2),
('All Nursing',null,'First Aid','The first priority in an unconscious patient is to assess:','["Airway and breathing","Hair and nails","Diet history","Sleep pattern"]'::jsonb,0,'Airway and breathing are immediate life-support priorities.',3),
('ANM','1st Year','Community Health Nursing','ORS is primarily used to prevent or treat:','["Dehydration","Fracture","Hypertension","Anaemia"]'::jsonb,0,'ORS replaces water and electrolytes lost during diarrhoea.',4),
('ANM','1st Year','Nutrition','A major source of energy in the diet is:','["Carbohydrate","Vitamin C","Water","Minerals"]'::jsonb,0,'Carbohydrates provide about 4 kcal per gram.',5),
('ANM','1st Year','Child Health','Exclusive breastfeeding is generally recommended for the first:','["1 month","3 months","6 months","12 months"]'::jsonb,2,'WHO recommends exclusive breastfeeding for the first six months.',6),
('ANM','2nd Year','Midwifery','The first stage of labour ends with:','["Full cervical dilatation","Delivery of placenta","Birth of baby","Onset of contractions"]'::jsonb,0,'The first stage ends when the cervix is fully dilated.',7),
('ANM','2nd Year','Midwifery','A danger sign during pregnancy is:','["Severe vaginal bleeding","Mild appetite change","Normal fetal movement","Occasional tiredness"]'::jsonb,0,'Severe vaginal bleeding requires urgent assessment.',8),
('ANM','2nd Year','Health Promotion','A balanced diet should contain:','["Only carbohydrates","A variety of essential nutrients","Only protein","Only fruits"]'::jsonb,1,'A balanced diet includes adequate macro- and micronutrients.',9),
('GNM','1st Year','Fundamentals of Nursing','The correct order of the nursing process is:','["Assessment, diagnosis, planning, implementation, evaluation","Planning, assessment, evaluation, diagnosis, implementation","Diagnosis, planning, assessment, evaluation, implementation","Evaluation, planning, assessment, diagnosis, implementation"]'::jsonb,0,'ADPIE is the common sequence of the nursing process.',10),
('GNM','1st Year','Pharmacology','The abbreviation IM means:','["Intramuscular","Intraocular","Inhaled medicine","Immediate medication"]'::jsonb,0,'IM stands for intramuscular.',11),
('GNM','2nd Year','Medical Surgical Nursing','A common sign of hypoglycaemia is:','["Sweating and tremor","Dry skin only","Bradycardia only","Jaundice"]'::jsonb,0,'Adrenergic symptoms can include sweating and tremor.',12),
('GNM','2nd Year','Mental Health Nursing','Therapeutic communication should primarily be:','["Patient-centred and non-judgmental","Argumentative","Dismissive","Secretive"]'::jsonb,0,'Therapeutic communication supports trust and patient-centred care.',13),
('GNM','3rd Year','Community Health Nursing','Primary prevention aims to:','["Prevent disease before it occurs","Treat complications only","Provide rehabilitation only","Diagnose late-stage disease"]'::jsonb,0,'Primary prevention targets risk reduction and disease prevention.',14),
('GNM','3rd Year','Midwifery','A newborn should be kept warm immediately after birth mainly to prevent:','["Hypothermia","Myopia","Hypertension","Dental caries"]'::jsonb,0,'Newborns are highly vulnerable to heat loss.',15),
('B.Sc Nursing','1st Year','Nursing Foundation','The main purpose of informed consent is to:','["Support an informed voluntary decision","Replace all documentation","Guarantee a cure","Avoid communication"]'::jsonb,0,'Consent supports an informed and voluntary decision.',16),
('B.Sc Nursing','1st Year','Physiology','The functional unit of the kidney is the:','["Neuron","Nephron","Alveolus","Osteon"]'::jsonb,1,'The nephron is the functional unit of the kidney.',17),
('B.Sc Nursing','1st Year','Psychology','Memory refers to the ability to:','["Encode, store and retrieve information","Only sleep","Only speak","Only calculate"]'::jsonb,0,'Memory involves encoding, storage and retrieval.',18),
('B.Sc Nursing','2nd Year','Medical Surgical Nursing','Which finding may indicate hypoxia?','["Cyanosis","Improved oxygen saturation","Normal breathing only","Warm hands only"]'::jsonb,0,'Cyanosis can be a clinical sign of low oxygenation.',19),
('B.Sc Nursing','2nd Year','Pharmacology','A drug given to reduce fever is called a/an:','["Antipyretic","Antacid","Anticoagulant","Antiemetic"]'::jsonb,0,'Antipyretics reduce fever.',20),
('B.Sc Nursing','3rd Year','Child Health Nursing','Growth monitoring helps identify:','["Growth faltering and nutritional problems","Only adult disease","Only fractures","Only eye colour"]'::jsonb,0,'Serial growth monitoring can identify growth faltering.',21),
('B.Sc Nursing','3rd Year','Mental Health Nursing','A hallucination is:','["A perception without an external stimulus","A planned exercise","A type of fracture","A normal vital sign"]'::jsonb,0,'Hallucination is a sensory perception without an external stimulus.',22),
('B.Sc Nursing','4th Year','Community Health Nursing','Health education is most effective when it is:','["Relevant, understandable and participatory","Highly technical only","One-way and unrelated","Without feedback"]'::jsonb,0,'Effective health education is understandable, relevant and participatory.',23),
('B.Sc Nursing','4th Year','Nursing Research','A hypothesis is best described as:','["A testable statement or prediction","A final result","A patient prescription","A hospital policy"]'::jsonb,0,'A hypothesis is a testable proposition.',24)
) as v(course,year_level,subject,question,options,correct_option,explanation,sort_order)
where not exists (select 1 from public.quiz_questions q where q.question=v.question and q.course=v.course);
