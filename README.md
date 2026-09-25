# Eagle Eye Security — Full-Stack Website

```
PUBLIC WEBSITE  →  FRONTEND (frontend/)  →  BACKEND API (backend/)  →  SUPABASE (db/schema.sql)
                                                    ↑
                                          ADMIN DASHBOARD (admin/)
```

Your original design, branding and copy are untouched. What's new:
- A working **Contact Us** form and **job application** flow, backed by a real database
- A **backend API** (Node/Express) that is the only thing allowed to talk to the database
- An **admin dashboard** to manage enquiries, applications, job postings, services and site settings
- Careers section on the public site is now **dynamic** — jobs you add in the dashboard appear automatically, no redeploy needed

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Open **SQL Editor** → paste the contents of `db/schema.sql` → Run.
3. Go to **Project Settings → API** and note down:
   - `Project URL` → this is `SUPABASE_URL`
   - `anon` `public` key → this is `SUPABASE_ANON_KEY`
   - `service_role` key → this is `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep this secret — backend only)

## 2. Create your admin account

1. Supabase Dashboard → **Authentication → Users → Add user** → create yourself with an email + password.
2. Copy that user's **UUID**.
3. Back in **SQL Editor**, run:
   ```sql
   insert into admins (id, email, name) values ('paste-the-uuid-here', 'you@eagleeyesecurity.in', 'Your Name');
   ```
   Only rows in this table can log into the admin dashboard, even though anyone can technically sign in with Supabase Auth — the backend checks this table on every admin request.

## 3. Deploy the backend

The `backend/` folder is a standalone Node.js/Express app. Deploy it anywhere that runs Node (Render, Railway, Fly.io, a VPS, etc.):

```bash
cd backend
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SMTP settings, etc.
npm install
npm start
```

Set the same environment variables in your hosting provider's dashboard (never commit `.env`). Note the deployed URL, e.g. `https://api.eagleeyesecurity.in`.

**Email notifications:** any SMTP provider works (Gmail with an App Password, SendGrid, Brevo, Zoho Mail, etc.) — just fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. If left blank, the site still saves enquiries/applications to the database — it just skips sending the notification email.

## 4. Point the frontend and admin dashboard at your backend

- `frontend/js/config.js` → set `API_BASE_URL` to your deployed backend URL.
- `admin/js/config.js` → set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `API_BASE_URL`.

## 5. Deploy the static sites

- `frontend/` → deploy exactly as you would today (Netlify, Vercel static, Nginx, cPanel, etc.) — it's still plain HTML/CSS/JS.
- `admin/` → deploy separately (e.g. `admin.eagleeyesecurity.in`), or serve it from a path your web server doesn't publicly link to. It's protected by login either way, but a separate subdomain is cleaner.

In the backend's `FRONTEND_ORIGINS` env var, list both the public site and admin dashboard's URLs so CORS allows them.

## 6. Try it end to end

1. Visit the public site → submit the Contact form → check `client_enquiries` in Supabase (Table Editor) and your inbox.
2. Log into `admin/index.html` → change that enquiry's status → confirm it updates.
3. Add a Job Opening from the dashboard → refresh the public site's Careers section → it should appear with no code changes.

---

## Project structure

```
frontend/            existing static site (unchanged design), now form-enabled
  index.html
  css/style.css
  js/main.js, config.js
  images/logo.jpg

backend/              Express API — the only thing with the Supabase service-role key
  src/index.js         app entrypoint, CORS, rate limiting
  src/routes/          enquiries, applications, jobs, services, settings, auth
  src/middleware/      requireAdmin (JWT + admins table check), input validation
  src/utils/mailer.js  admin email notifications
  .env.example

admin/                Admin dashboard (separate static site)
  index.html           login (Supabase Auth)
  dashboard.html + js/admin.js   enquiries / applications / jobs / services / settings

db/schema.sql          tables, RLS lockdown, triggers, seed data
```

## Security notes

- Every table has RLS **enabled with no policies for anon/authenticated** — the database is unreachable directly from any browser, public or admin. All access goes through the backend using the service-role key.
- The service-role key lives only in the backend's environment variables — never in `frontend/` or `admin/` code.
- Admin routes require a valid Supabase session JWT **and** a matching row in `admins` — a stolen anon key alone gets an attacker nothing.
- Public POST endpoints (`/api/enquiries`, `/api/applications`) are rate-limited (20 requests / 15 min per IP) to reduce spam.
- All form input is validated and length-capped server-side before it touches the database.

## Extending later

- **Resume uploads:** add a Supabase Storage bucket, generate a signed upload URL from a new backend endpoint, save the resulting path into `job_applications.resume_url`.
- **Multiple admin roles:** add a `role` column to `admins` and branch in `requireAdmin`.
- **More editable content:** add new keys to `website_settings` and read them into the frontend the same way jobs/services are fetched.
