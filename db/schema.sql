-- ============================================================================
-- Eagle Eye Security — Database schema (Supabase / PostgreSQL)
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- admins
-- Maps a Supabase Auth user (auth.users) to an allowed admin account.
-- There is no "sign up" flow for this table: you create the auth user in the
-- Supabase dashboard (Authentication -> Users -> Add user), then insert a
-- matching row here using that user's id.
-- ---------------------------------------------------------------------------
create table if not exists admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- client_enquiries  (Contact Us form)
-- ---------------------------------------------------------------------------
create table if not exists client_enquiries (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  mobile       text not null,
  subject      text not null,
  message      text not null,
  status       text not null default 'New'
               check (status in ('New','Contacted','In Progress','Closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_enquiries_updated on client_enquiries;
create trigger trg_enquiries_updated
  before update on client_enquiries
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- job_openings  (managed from the admin dashboard, shown on Careers section)
-- ---------------------------------------------------------------------------
create table if not exists job_openings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  location     text,
  description  text,
  requirements text,           -- plain text, one requirement per line
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_jobs_updated on job_openings;
create trigger trg_jobs_updated
  before update on job_openings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- job_applications
-- ---------------------------------------------------------------------------
create table if not exists job_applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references job_openings(id) on delete set null,
  name         text not null,
  email        text not null,
  mobile       text not null,
  cover_note   text,
  resume_url   text,           -- optional: wire up Supabase Storage later
  status       text not null default 'New'
               check (status in ('New','Reviewed','Shortlisted','Rejected','Hired')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_applications_updated on job_applications;
create trigger trg_applications_updated
  before update on job_applications
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- services  (the "What we protect" cards — admin manageable)
-- ---------------------------------------------------------------------------
create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  icon        text,             -- free-text key, e.g. 'shield', 'building'
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_services_updated on services;
create trigger trg_services_updated
  before update on services
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- website_settings  (simple key/value store for editable site content)
-- e.g. key='phone', value='"+91 98765 43210"'
--      key='hero_stats', value='{"year_founded":2026,"cities_hiring":5}'
-- ---------------------------------------------------------------------------
create table if not exists website_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_settings_updated on website_settings;
create trigger trg_settings_updated
  before update on website_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Every table is locked down completely: RLS is enabled and NO policies are
-- created for `anon` or `authenticated`. That means nothing is reachable
-- directly from a browser via the Supabase client libraries, from either the
-- public site or the admin dashboard. The only way in is the backend API,
-- which uses the service-role key (service_role bypasses RLS by design).
-- ---------------------------------------------------------------------------
alter table admins            enable row level security;
alter table client_enquiries  enable row level security;
alter table job_openings      enable row level security;
alter table job_applications  enable row level security;
alter table services          enable row level security;
alter table website_settings  enable row level security;

-- ---------------------------------------------------------------------------
-- Seed data (safe to skip/edit)
-- ---------------------------------------------------------------------------
insert into services (title, description, icon, sort_order) values
  ('Manned Guarding', 'Trained guards stationed at gates, lobbies and perimeters, working fixed post orders with logged rounds.', 'shield', 1),
  ('Corporate Security', 'Access control, visitor management and reception-point security suited to offices and business parks.', 'building', 2),
  ('Event Security', 'Crowd management, entry screening and coordination for weddings, exhibitions and public gatherings.', 'pulse', 3),
  ('Residential Security', 'Round-the-clock watch for societies and gated communities, including visitor logs and night patrols.', 'home', 4),
  ('Supervisory Patrols', 'Site supervisors run scheduled checks on every guard post and file a daily written report.', 'target', 5),
  ('Fire & Safety Watch', 'Basic fire-watch duty and emergency-response drills for warehouses and industrial premises.', 'flame', 6)
on conflict do nothing;

insert into job_openings (title, location, description, requirements) values
  ('Security Guard', 'Satara, Pune, Mumbai, Navi Mumbai, Thane',
   'Gate duty, visitor checks and round logging. Uniform, ID card and basic training provided.',
   'Rotational shifts, weekly off'||chr(10)||'18+ years, physically fit'||chr(10)||'Basic literacy preferred'),
  ('Supervisor', 'Satara, Pune, Mumbai, Navi Mumbai, Thane',
   'Runs scheduled checks across assigned guard posts and files daily reports.',
   'Prior security or team-lead experience preferred'||chr(10)||'Handles first-level escalations')
on conflict do nothing;

insert into website_settings (key, value) values
  ('phone', '"+919876543210"'),
  ('whatsapp', '"919876543210"'),
  ('email', '"contact@eagleeyesecurity.in"'),
  ('address', '"Satara, Maharashtra, India"')
on conflict (key) do nothing;
