-- ============================================================
-- CHIMACY OF UNN — Schema v2 additions
-- Run this AFTER schema.sql, in the same Supabase SQL Editor.
-- This file is 100% ADDITIVE: it does not drop or truncate any existing
-- table or row. It only creates new tables/functions, and replaces
-- security POLICIES (which control who can do what - not your data) on a
-- few existing tables to make them role-aware. Your existing programmes,
-- rules, settings, and quotations rows are untouched.
-- ============================================================

-- ---------------------------------------------------------------
-- TABLE: admin_profiles (multi-admin support with roles)
-- ---------------------------------------------------------------
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Admin',
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  last_login timestamptz
);
alter table public.admin_profiles enable row level security;

-- The very first admin_profiles row ever created becomes super_admin
-- automatically (bootstrap) - every profile after that defaults to 'admin'.
-- This lets the very first person who logs in become the super admin
-- without anyone needing a service-role key or manual SQL.
create or replace function public.bootstrap_first_admin_role()
returns trigger as $$
begin
  if (select count(*) from public.admin_profiles) = 0 then
    new.role := 'super_admin';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_bootstrap_first_admin on public.admin_profiles;
create trigger trg_bootstrap_first_admin
before insert on public.admin_profiles
for each row execute function public.bootstrap_first_admin_role();

-- Helper used throughout this file's RLS policies to check "is the
-- currently-authenticated user a super admin".
create or replace function public.is_super_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and role = 'super_admin' and status = 'active'
  );
$$;

drop policy if exists "admin_profiles_select" on public.admin_profiles;
drop policy if exists "admin_profiles_insert_self" on public.admin_profiles;
drop policy if exists "admin_profiles_update" on public.admin_profiles;
drop policy if exists "admin_profiles_delete" on public.admin_profiles;

create policy "admin_profiles_select" on public.admin_profiles for select using (auth.role() = 'authenticated');
-- Self-provisioning only (first login auto-creates your own row).
create policy "admin_profiles_insert_self" on public.admin_profiles for insert with check (auth.uid() = id);
-- Only a super admin may change anyone's role/status/name (including their
-- own) after the initial bootstrap row - prevents an ordinary admin from
-- promoting themselves.
create policy "admin_profiles_update" on public.admin_profiles for update using (public.is_super_admin());
create policy "admin_profiles_delete" on public.admin_profiles for delete using (public.is_super_admin());

-- ---------------------------------------------------------------
-- Role-aware policies on EXISTING tables (branding/pricing/rules/settings
-- restricted to super admins; both roles keep working day-to-day client and
-- payment operations). This changes WHO can write, not your existing data.
-- ---------------------------------------------------------------
drop policy if exists "programmes_insert" on public.programmes;
drop policy if exists "programmes_update" on public.programmes;
drop policy if exists "programmes_delete" on public.programmes;
create policy "programmes_insert" on public.programmes for insert with check (public.is_super_admin());
create policy "programmes_update" on public.programmes for update using (public.is_super_admin());
create policy "programmes_delete" on public.programmes for delete using (public.is_super_admin());

drop policy if exists "rules_insert" on public.rules;
drop policy if exists "rules_update" on public.rules;
drop policy if exists "rules_delete" on public.rules;
drop policy if exists "rules_select" on public.rules;
-- Terms & Conditions must be publicly readable - a prospective client has to
-- be able to see them on the homepage and before submitting a request,
-- without logging in. Only writes stay restricted to super admins.
create policy "rules_select" on public.rules for select using (true);
create policy "rules_insert" on public.rules for insert with check (public.is_super_admin());
create policy "rules_update" on public.rules for update using (public.is_super_admin());
create policy "rules_delete" on public.rules for delete using (public.is_super_admin());

drop policy if exists "settings_update" on public.settings;
drop policy if exists "settings_insert" on public.settings;
create policy "settings_update" on public.settings for update using (public.is_super_admin());
create policy "settings_insert" on public.settings for insert with check (public.is_super_admin());

-- Any authenticated admin can still confirm payments / edit quotations day
-- to day; only a super admin can delete a client record outright.
drop policy if exists "quotations_delete" on public.quotations;
create policy "quotations_delete" on public.quotations for delete using (public.is_super_admin());

-- ---------------------------------------------------------------
-- TABLE: requests (Client Portal submissions - the public intake table)
-- ---------------------------------------------------------------
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_number text unique,
  full_name text not null,
  phone text not null,
  email text default '',
  jamb_reg_number text default '',
  jamb_score integer,
  institution text default 'University of Nigeria, Nsukka',
  programme_id uuid references public.programmes(id) on delete set null,
  programme_name text default '',
  programme_grade text default '',
  working_type text default '',
  price numeric default 0,
  eligibility_status text default '',
  benchmark_status text default '',
  recommendation text default '',
  additional_notes text default '',
  terms_accepted boolean not null default false check (terms_accepted = true),
  terms_accepted_at timestamptz,
  status text not null default 'PENDING' check (status in (
    'PENDING','UNDER_REVIEW','ACCEPTED','CONTACTED','PAYMENT_PENDING',
    'PAYMENT_CONFIRMED','PROCESSING','COMPLETED','REJECTED','CANCELLED'
  )),
  linked_quotation_id uuid references public.quotations(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.requests enable row level security;

-- Deliberately NO direct anon SELECT/INSERT policy on this table - public
-- access goes only through the two SECURITY DEFINER functions below, which
-- expose just the safe subset of fields a stranger on the internet should
-- ever see. Admins get full access via the authenticated policies.
drop policy if exists "requests_select_admin" on public.requests;
drop policy if exists "requests_update_admin" on public.requests;
drop policy if exists "requests_delete_admin" on public.requests;
create policy "requests_select_admin" on public.requests for select using (auth.role() = 'authenticated');
create policy "requests_update_admin" on public.requests for update using (auth.role() = 'authenticated');
create policy "requests_delete_admin" on public.requests for delete using (public.is_super_admin());

create sequence if not exists public.request_number_seq start 1;
create or replace function public.set_request_number()
returns trigger as $$
begin
  if new.request_number is null then
    new.request_number := 'REQ-' || extract(year from now())::text || '-' || lpad(nextval('public.request_number_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_request_number on public.requests;
create trigger trg_set_request_number
before insert on public.requests
for each row execute function public.set_request_number();

drop trigger if exists trg_touch_requests on public.requests;
create trigger trg_touch_requests
before update on public.requests
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- TABLE: request_status_history (auto-logged, admin-only, never public)
-- ---------------------------------------------------------------
create table if not exists public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete cascade,
  status text not null,
  changed_at timestamptz default now()
);
alter table public.request_status_history enable row level security;
drop policy if exists "request_status_history_select" on public.request_status_history;
create policy "request_status_history_select" on public.request_status_history for select using (auth.role() = 'authenticated');
-- No insert/update/delete policy for any client role - only the trigger
-- below (running as the table owner) writes to this table.

create or replace function public.log_request_status_change()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    insert into public.request_status_history (request_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_log_request_status on public.requests;
create trigger trg_log_request_status
after update on public.requests
for each row execute function public.log_request_status_change();

-- Also log the initial PENDING status the moment a request is created.
create or replace function public.log_request_status_initial()
returns trigger as $$
begin
  insert into public.request_status_history (request_id, status) values (new.id, new.status);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_log_request_status_initial on public.requests;
create trigger trg_log_request_status_initial
after insert on public.requests
for each row execute function public.log_request_status_initial();

-- ---------------------------------------------------------------
-- TABLE: request_notes (private admin notes - never exposed publicly)
-- ---------------------------------------------------------------
create table if not exists public.request_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete cascade,
  admin_id uuid references auth.users(id),
  admin_name text default 'Admin',
  note text not null,
  created_at timestamptz default now()
);
alter table public.request_notes enable row level security;
drop policy if exists "request_notes_select" on public.request_notes;
drop policy if exists "request_notes_insert" on public.request_notes;
create policy "request_notes_select" on public.request_notes for select using (auth.role() = 'authenticated');
create policy "request_notes_insert" on public.request_notes for insert with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Sync: when a linked quotation gets marked paid (via the existing
-- Checkout page), automatically move the linked request to
-- PAYMENT_CONFIRMED - keeps the two tables in sync without duplicating
-- payment logic in the app.
-- ---------------------------------------------------------------
create or replace function public.sync_request_on_quotation_paid()
returns trigger as $$
begin
  if new.paid = true and (old.paid is distinct from new.paid) then
    update public.requests
    set status = 'PAYMENT_CONFIRMED'
    where linked_quotation_id = new.id and status is distinct from 'PAYMENT_CONFIRMED';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_sync_request_on_paid on public.quotations;
create trigger trg_sync_request_on_paid
after update on public.quotations
for each row execute function public.sync_request_on_quotation_paid();

-- ---------------------------------------------------------------
-- SECURE PUBLIC RPCs (the only way anon/public visitors touch `requests`)
-- ---------------------------------------------------------------

-- Submits a new assistance request. Runs with definer rights so anon needs
-- zero direct table grants on `requests` - keeps every other client's
-- personal data completely unreadable to the public.
create or replace function public.create_request(payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  new_row public.requests;
begin
  if coalesce((payload->>'terms_accepted')::boolean, false) is not true then
    raise exception 'Terms and conditions must be accepted.';
  end if;

  insert into public.requests (
    full_name, phone, email, jamb_reg_number, jamb_score, institution,
    programme_id, programme_name, programme_grade, working_type, price,
    eligibility_status, benchmark_status, recommendation, additional_notes,
    terms_accepted, terms_accepted_at
  ) values (
    payload->>'full_name', payload->>'phone', payload->>'email', payload->>'jamb_reg_number',
    nullif(payload->>'jamb_score','')::int,
    coalesce(payload->>'institution', 'University of Nigeria, Nsukka'),
    nullif(payload->>'programme_id','')::uuid, payload->>'programme_name', payload->>'programme_grade',
    payload->>'working_type', coalesce((payload->>'price')::numeric, 0),
    payload->>'eligibility_status', payload->>'benchmark_status', payload->>'recommendation',
    payload->>'additional_notes', true, now()
  )
  returning * into new_row;

  return jsonb_build_object(
    'id', new_row.id,
    'request_number', new_row.request_number,
    'programme_name', new_row.programme_name,
    'working_type', new_row.working_type,
    'price', new_row.price,
    'status', new_row.status,
    'eligibility_status', new_row.eligibility_status
  );
end;
$$;
grant execute on function public.create_request(jsonb) to anon, authenticated;

-- Public request tracking - phone number acts as a shared secret alongside
-- the request number. Returns only the safe subset of fields; never
-- exposes admin notes, other clients' data, or full contact details.
create or replace function public.get_request_status(p_request_number text, p_phone text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r public.requests;
begin
  select * into r from public.requests
  where request_number = p_request_number and phone = p_phone
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'request_number', r.request_number,
    'programme_name', r.programme_name,
    'working_type', r.working_type,
    'price', r.price,
    'status', r.status,
    'created_at', r.created_at
  );
end;
$$;
grant execute on function public.get_request_status(text, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- PUBLIC-SAFE programme browsing + eligibility calculation.
-- The `programmes` table itself stays authenticated-only (it holds your
-- confidential internal benchmark numbers). These two functions expose only
-- what a prospective client should see: for browsing, just name/grade/price
-- (no benchmark figures at all); for a specific eligibility check, the
-- computed result plus that ONE programme's benchmark range as descriptive
-- text (matching how the result is meant to be explained to a client) -
-- never the whole benchmark database at once.
-- ---------------------------------------------------------------
create or replace function public.list_programmes_public()
returns table (id uuid, name text, grade text, price numeric, double_price numeric)
language sql security definer set search_path = public stable
as $$
  select id, name, grade, price, double_price from public.programmes order by grade, name;
$$;
grant execute on function public.list_programmes_public() to anon, authenticated;

create or replace function public.check_eligibility(p_programme_id uuid, p_jamb_score integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  p public.programmes;
  v_status text;
  v_working_type text;
  v_price numeric;
  v_benchmark_status text;
  v_recommendation text;
begin
  select * into p from public.programmes where id = p_programme_id;
  if not found then
    return jsonb_build_object('error', 'Programme not found');
  end if;

  if p_jamb_score >= p.preferred_score then
    v_status := 'Eligible';
    v_working_type := 'Single Working';
    v_price := p.price;
    v_benchmark_status := 'Meets normal benchmark (' || p.normal_benchmark || ')';
    v_recommendation := 'Based on the information provided, you meet the internal eligibility benchmark for this programme under Normal Working.';
  elsif p_jamb_score >= p.double_working_score then
    v_status := 'Eligible (Double Working)';
    v_working_type := 'Double Working';
    v_price := p.double_price;
    v_benchmark_status := 'Within Double Working benchmark (' || p.double_benchmark || ')';
    v_recommendation := 'Your score qualifies under our Double Working arrangement for this programme, which carries a different fee.';
  elsif p_jamb_score >= p.minimum_score then
    v_status := 'Eligible (Double Working)';
    v_working_type := 'Double Working';
    v_price := p.double_price;
    v_benchmark_status := 'Borderline - above minimum threshold, Double Working recommended';
    v_recommendation := 'Your score is borderline for this programme. Double Working is recommended, and a backup programme may be worth considering.';
  else
    v_status := 'Not Eligible';
    v_working_type := null;
    v_price := 0;
    v_benchmark_status := 'Below the internal benchmark for this programme';
    v_recommendation := 'Based on the information provided, you do not currently meet the internal eligibility benchmark for this programme. Consider another programme, or contact us to discuss options.';
  end if;

  return jsonb_build_object(
    'programme_id', p.id,
    'programme_name', p.name,
    'programme_grade', p.grade,
    'status', v_status,
    'working_type', v_working_type,
    'price', v_price,
    'benchmark_status', v_benchmark_status,
    'recommendation', v_recommendation
  );
end;
$$;
grant execute on function public.check_eligibility(uuid, integer) to anon, authenticated;

-- ============================================================
-- DONE. Next: log in to the app once with each admin account you created
-- in Supabase (Authentication > Users) so their admin_profiles row gets
-- created automatically. The very first person to log in becomes Super
-- Admin; everyone after that starts as a regular Admin until a super admin
-- promotes them from the Administrators page.
-- ============================================================
