# MPI RoboFest 2026

Framework-free public website using HTML, CSS and vanilla JavaScript. Vercel hosts the static site and serverless registration endpoint. Supabase stores registrations and authenticates admins. Resend sends confirmation emails.

## Files
- `index.html` — event website and registration form
- `style.css` — responsive blue/yellow/orange design
- `config.js` — public Supabase URL and anon key (admin dashboard only)
- `app.js` — public form submission
- `admin.html` / `admin.js` — admin login and registrations dashboard
- `schema.sql` — database tables and Row Level Security
- `api/register.js` — server-side registration storage and confirmation email
- `package.json` — serverless dependencies
- `vercel.json` — Vercel function configuration

## 1. Set up Supabase
1. Create a project at https://supabase.com.
2. Open SQL Editor, paste and run `schema.sql`.
3. Open Project Settings → API and copy Project URL and anon/public key.
4. Put these in `config.js` as `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
5. Never put the `service_role` key in `config.js` or browser JavaScript.

## 2. Create the admin account
1. In Supabase → Authentication → Users, create an admin user with an email and password.
2. Copy that user's UUID.
3. Run this in SQL Editor, replacing the UUID:

```sql
insert into public.registrations_admins (user_id)
values ('YOUR_ADMIN_USER_UUID');
```

4. Open `/admin.html` after deployment and sign in. Only users listed in `registrations_admins` can view registration records.

## 3. Configure confirmation email
1. Create an account at https://resend.com and verify a sending domain.
2. Create a Resend API key.
3. In Vercel → Project → Settings → Environment Variables, add:
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key (server-side only)
   - `RESEND_API_KEY` — Resend API key
   - `EMAIL_FROM` — sender on your verified domain, e.g. `MPI RoboFest <events@your-domain.com>`
4. Redeploy after adding variables.

The API saves the registration in Supabase and then sends a confirmation email to the school's contact email. If email delivery fails, the registration remains saved.

## 4. Deploy to Vercel
1. Upload this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Framework Preset: Other. Leave Build Command blank; use `.` as Output Directory if required.
4. Add the environment variables above and deploy.
5. Website: `/`; admin: `/admin.html`.

## 5. Test
- Submit a test registration.
- Check the `registrations` table in Supabase.
- Check the school's inbox for the confirmation.
- Sign in at `/admin.html`, check the registration and test CSV export.
- Test on mobile.

## Important
- Each registration contains one male and one female student, each in Grade 7 or above.
- The form requires a school contact email for the confirmation.
- The map uses a Google Maps place search for Mechinagar Polytechnic Institute. Verify the exact pin and replace the iframe query if needed.
- Confirm event year and dates before publishing.
- Add CAPTCHA/rate limiting before wide public release to reduce spam.
