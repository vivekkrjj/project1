# Bhumi Nursing College — Final Deployment Checklist

## Supabase (one time)
1. Run `supabase/MASTER_SETUP.sql` in SQL Editor.
2. Create the admin user in Authentication.
3. Set that user's `profiles.role` to `admin` using the SQL in README.md.
4. Verify the admin can log in at `admin.html`.
5. In Admin → News & Notices, publish a test notice.
6. Open Home page and confirm the notice appears.
7. Test Courses, Faculty, Gallery upload and Student approval.

## Vercel
1. Deploy the project as a static site.
2. No server-side environment variable is required by this build because `js/config.js` contains the public Supabase URL and publishable/anon key.
3. Never replace the public key with a service-role/secret key.

## Daily operation
Admin Login → Dashboard → edit/save.

Do not manually edit Supabase tables for routine website content.
