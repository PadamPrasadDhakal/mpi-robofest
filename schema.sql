-- Run this entire file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  school_name text not null,
  school_address text not null,
  contact_person text not null,
  contact_phone text not null,
  contact_email text not null,
  male_student_name text not null,
  male_student_class text not null,
  male_student_address text not null,
  female_student_name text not null,
  female_student_class text not null,
  female_student_address text not null
);

create table if not exists public.registrations_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.registrations enable row level security;
alter table public.registrations_admins enable row level security;

-- The public website writes registrations through /api/register using a server-only
-- service-role key. No public SELECT, INSERT, UPDATE or DELETE policies are granted.

drop policy if exists "Admins can read registrations" on public.registrations;
create policy "Admins can read registrations"
on public.registrations for select
to authenticated
using (
  exists (
    select 1 from public.registrations_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can read own admin record" on public.registrations_admins;
create policy "Admins can read own admin record"
on public.registrations_admins for select
to authenticated
using (user_id = (select auth.uid()));

-- Do not create public UPDATE or DELETE policies for either table.
