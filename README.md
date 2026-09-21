# Bhumi Nursing College — Admin Controlled Build

This project is structured so that **Vercel is only the hosting/deployment layer** and the routine website management happens from the **Admin Login**.

## What the Admin Panel controls

- Site name, tagline, email, phone, address and footer
- Primary/accent theme colors
- Home hero, About, Academics, Admission and Contact content
- Home section visibility
- Courses: add, edit, delete and order
- Facilities: add, edit, delete and order
- Gallery: add/edit/delete; upload images directly to Supabase Storage
- Quick links
- News/notices: add, edit and delete
- Faculty/staff: add, edit and delete
- Student registration requests: view, approve and reject
- Student Portal headings/content and section visibility

## One-time Supabase setup

1. Open your Supabase project.
2. Open **SQL Editor**.
3. Run **`supabase/MASTER_SETUP.sql`** completely.
4. In Supabase Authentication, create the administrator account.
5. Copy that admin user's UUID from Authentication.
6. Run this SQL, replacing the UUID:

```sql
insert into public.profiles(id, full_name, role)
values('YOUR_ADMIN_USER_UUID','Administrator','admin')
on conflict(id) do update set role='admin';
```

After that, routine work should be done from:

**Admin Login → Admin Dashboard**

You should not need to manually insert notices/content in Supabase.

## Vercel deployment

Upload this project to your Git repository and deploy it on Vercel.

The frontend uses only the Supabase **publishable/anon key**. Never put a Supabase service-role/secret key in `js/config.js`.

The current `js/config.js` contains the project's public Supabase URL/key. If you move to another Supabase project, replace those two public values.

## Security model

- Supabase Auth identifies the logged-in user.
- `profiles.role = 'admin'` authorizes the Admin Panel.
- Supabase Row Level Security protects database writes.
- Public visitors can read public CMS content.
- Students can read their own registration and authenticated student data.
- Only admins can create/update/delete CMS data, notices, faculty and gallery files.

## Important

The site can show fallback content if Supabase is temporarily unavailable, but **Admin editing requires the Supabase database setup above**.

Do not expose:
- Supabase service-role key
- database password
- private API keys
- student passwords

## Final daily workflow

```text
Vercel
  ↓
Public Website / Student Portal
  ↓
Admin Login
  ↓
Admin Dashboard
  ↓
Supabase Auth + RLS
  ↓
Database / Storage
```

The intended daily workflow is simply: **login as admin → edit → save**.


## UI change
- Student Login and Admin Login links/buttons were removed from the public home page header/footer. Authentication pages remain available directly and are not deleted.


## UI change
- Removed the top contact strip items: info@bhuminc.edu.in, +91 98765 43210, and Bhumi Nagar, India from the public home page.


## UI change
- Added Student Login and Admin Login menu items back into the public navigation menu.


## Home page sample content
- Redesigned the public home page with a modern nursing-college layout, responsive header/footer, hero, campus gallery, facilities, notices and Lalganj, Vaishali map.
- Temporary campus/facility images and sample notices are included as fallback content.
- For an already-configured Supabase project, run `supabase/HOME_SAMPLE_CONTENT.sql` once. After that, the Admin Panel can edit/delete the sample content.
- ANM, GNM and B.Sc Nursing duration/eligibility/FAQ information is available on `course-details.html`.


## CMS repair
If Admin Login works but About/Courses/Facilities/Faculty/Notices cannot be saved, run `supabase/CMS_REPAIR.sql` once in the Supabase SQL Editor. The current Admin CMS also displays the actual Supabase error instead of failing silently.


## Expanded Course-Locked Study Material
The expanded catalogue separates ANM, GNM and B.Sc Nursing by year and subject. Students only receive their approved course resources plus common All Nursing resources. Official/open resources are linked rather than copying copyrighted textbooks.
