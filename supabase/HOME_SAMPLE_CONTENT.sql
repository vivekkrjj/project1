-- Bhumi Nursing College: temporary home-page sample content
-- Run once in Supabase SQL Editor. Admin can later edit/delete everything from Admin Panel.

insert into public.site_content(content_key,content,updated_at) values
('site_settings','{"college_name":"Bhumi Nursing College","tagline":"Healthy • Skilled • Compassionate","email":"info@bhuminc.edu.in","phone":"+91 98765 43210","address":"Lalganj, Vaishali, Bihar","footer_text":"© 2026 Bhumi Nursing College. All Rights Reserved.","primary_color":"#123b73","accent_color":"#e5b51b","show_topbar":true,"show_news":true}'::jsonb,now()),
('about','{"eyebrow":"ABOUT US","title":"Welcome to Bhumi Nursing College","description":"Bhumi Nursing College is focused on preparing caring, confident and professionally skilled nurses through classroom learning, practical skill development and clinical exposure. Our aim is to create a supportive academic environment where students learn with discipline, empathy and a strong commitment to patient care.","button_text":"Know More","button_link":"#contact","show":true}'::jsonb,now())
on conflict(content_key) do update set content=excluded.content,updated_at=now();

insert into public.site_items(item_type,title,description,subtitle,icon,image_url,link_url,sort_order,is_active)
select * from (values
('course','B.Sc Nursing','Four-year undergraduate nursing programme with theory, skills lab and clinical training.','4 Years','🎓',null,'course-details.html#bsc',1,true),
('course','GNM','General Nursing & Midwifery programme focused on practical patient care and clinical training.','3 Years','⚕',null,'course-details.html#gnm',2,true),
('course','ANM','Auxiliary Nurse Midwifery programme covering foundational nursing and community care.','2 Years','📜',null,'course-details.html#anm',3,true),
('facility','Modern Campus','A clean, welcoming campus designed for focused nursing education.','', '🏫','https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80',null,1,true),
('facility','Nursing Skill Lab','Hands-on practice for essential nursing procedures and clinical skills.','', '🧪','https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=900&q=80',null,2,true),
('facility','Library','A quiet study space with books and learning resources for students.','', '📖','https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',null,3,true),
('facility','Smart Classrooms','Interactive classrooms for theory, discussion and academic learning.','', '🏫','https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=900&q=80',null,4,true),
('gallery','College Campus','Campus view','', '🏫','https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',null,1,true),
('gallery','Nursing Learning','Healthcare learning environment','', '🩺','https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80',null,2,true),
('gallery','Library','Study and reference resources','', '📖','https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80',null,3,true),
('gallery','Classroom','Academic classroom','', '🎓','https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80',null,4,true)
) as v(item_type,title,description,subtitle,icon,image_url,link_url,sort_order,is_active)
where not exists (select 1 from public.site_items x where x.item_type=v.item_type and x.title=v.title);

insert into public.notices(title,details,category,is_new,published_at)
select * from (values
('Admissions enquiry desk is open','Students and guardians can contact the college office for ANM, GNM and B.Sc Nursing course information.','Admission',true,'2026-08-24 08:00:00+05:30'::timestamptz),
('Welcome to Bhumi Nursing College','The college website has been updated with course information, campus facilities and student portal access.','General',true,'2026-08-23 08:00:00+05:30'::timestamptz),
('Course information and eligibility','Detailed duration, qualification and frequently asked questions are available on the Courses page.','Notice',false,'2026-08-22 08:00:00+05:30'::timestamptz)
) as v(title,details,category,is_new,published_at)
where not exists (select 1 from public.notices n where n.title=v.title);
