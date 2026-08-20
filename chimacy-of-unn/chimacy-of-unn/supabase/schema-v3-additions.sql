-- ============================================================
-- CHIMACY OF UNN — Schema v3 additions
-- Run this AFTER schema.sql AND schema-v2-additions.sql, in order.
-- 100% additive - existing tables/rows are untouched; this only adds new
-- tables/columns/functions and extends a few existing policies.
-- ============================================================

-- ---------------------------------------------------------------
-- Extend `settings` with WhatsApp + website fields (additive columns)
-- ---------------------------------------------------------------
alter table public.settings add column if not exists whatsapp_number text default '';
alter table public.settings add column if not exists website text default '';
alter table public.settings add column if not exists secondary_color text default '#16a34a';
alter table public.settings add column if not exists flutterwave_public_key text default '';

-- ---------------------------------------------------------------
-- TABLE: jamb_subjects (centralized subject list, editable by super admin)
-- ---------------------------------------------------------------
create table if not exists public.jamb_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer default 0
);
alter table public.jamb_subjects enable row level security;
drop policy if exists "jamb_subjects_select" on public.jamb_subjects;
drop policy if exists "jamb_subjects_write" on public.jamb_subjects;
create policy "jamb_subjects_select" on public.jamb_subjects for select using (true);
create policy "jamb_subjects_write" on public.jamb_subjects for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.jamb_subjects (name, sort_order) values
('English Language', 0), ('Mathematics', 1), ('Physics', 2), ('Chemistry', 3),
('Biology', 4), ('Economics', 5), ('Government', 6), ('Commerce', 7),
('Literature in English', 8), ('Geography', 9), ('Agricultural Science', 10),
('Accounting', 11), ('CRK', 12), ('IRK', 13), ('History', 14), ('Civic Education', 15)
on conflict (name) do nothing;

-- ---------------------------------------------------------------
-- TABLE: olevel_subjects (centralized subject list, editable by super admin)
-- ---------------------------------------------------------------
create table if not exists public.olevel_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer default 0
);
alter table public.olevel_subjects enable row level security;
drop policy if exists "olevel_subjects_select" on public.olevel_subjects;
drop policy if exists "olevel_subjects_write" on public.olevel_subjects;
create policy "olevel_subjects_select" on public.olevel_subjects for select using (true);
create policy "olevel_subjects_write" on public.olevel_subjects for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.olevel_subjects (name, sort_order) values
('English Language', 0), ('Mathematics', 1), ('Physics', 2), ('Chemistry', 3),
('Biology', 4), ('Economics', 5), ('Government', 6), ('Commerce', 7),
('Literature in English', 8), ('Geography', 9), ('Agricultural Science', 10),
('Accounting', 11), ('CRK', 12), ('IRK', 13), ('History', 14), ('Civic Education', 15),
('Further Mathematics', 16), ('Food and Nutrition', 17)
on conflict (name) do nothing;

-- ---------------------------------------------------------------
-- TABLE: grade_conversion (O'Level grade -> marks, editable by super admin)
-- ---------------------------------------------------------------
create table if not exists public.grade_conversion (
  grade text primary key,
  marks numeric not null,
  sort_order integer default 0
);
alter table public.grade_conversion enable row level security;
drop policy if exists "grade_conversion_select" on public.grade_conversion;
drop policy if exists "grade_conversion_write" on public.grade_conversion;
create policy "grade_conversion_select" on public.grade_conversion for select using (true);
create policy "grade_conversion_write" on public.grade_conversion for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.grade_conversion (grade, marks, sort_order) values
('A1', 90, 0), ('B2', 80, 1), ('B3', 70, 2), ('C4', 60, 3), ('C5', 50, 4),
('C6', 40, 5), ('D7', 0, 6), ('E8', 0, 7), ('F9', 0, 8)
on conflict (grade) do update set marks = excluded.marks, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------
-- TABLE: aggregate_settings (single-row, configurable calculation model)
-- ---------------------------------------------------------------
create table if not exists public.aggregate_settings (
  id integer primary key default 1,
  jamb_weight numeric not null default 0.90,
  olevel_weight numeric not null default 0.10,
  one_sitting_bonus numeric not null default 40,
  terms_version text not null default 'v1',
  disclaimer text not null default 'Eligibility assessment is based on the information and assessment criteria currently configured on this platform. It does not constitute a guarantee of admission. Final admission remains subject to the relevant institution''s admission requirements, policies and available spaces.',
  updated_at timestamptz default now(),
  constraint aggregate_settings_singleton check (id = 1)
);
alter table public.aggregate_settings enable row level security;
drop policy if exists "aggregate_settings_select" on public.aggregate_settings;
drop policy if exists "aggregate_settings_write" on public.aggregate_settings;
create policy "aggregate_settings_select" on public.aggregate_settings for select using (true);
create policy "aggregate_settings_write" on public.aggregate_settings for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.aggregate_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Extend `requests` with assessment detail (additive columns)
-- ---------------------------------------------------------------
alter table public.requests add column if not exists jamb_subjects jsonb default '[]'::jsonb;
alter table public.requests add column if not exists olevel_subjects jsonb default '[]'::jsonb;
alter table public.requests add column if not exists olevel_sittings integer default 1;
alter table public.requests add column if not exists olevel_score numeric default 0;
alter table public.requests add column if not exists one_sitting_bonus_applied numeric default 0;
alter table public.requests add column if not exists jamb_contribution numeric default 0;
alter table public.requests add column if not exists olevel_contribution numeric default 0;
alter table public.requests add column if not exists aggregate numeric default 0;
alter table public.requests add column if not exists terms_version text default 'v1';
alter table public.requests add column if not exists payment_status text default 'UNPAID'
  check (payment_status in ('UNPAID','PENDING','SUCCESSFUL','FAILED','CANCELLED','REFUNDED'));

-- ---------------------------------------------------------------
-- TABLE: payments (Flutterwave transaction records)
-- ---------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete set null,
  quotation_id uuid references public.quotations(id) on delete set null,
  client_name text default '',
  amount numeric not null default 0,
  currency text not null default 'NGN',
  flutterwave_tx_id text,
  tx_ref text unique,
  status text not null default 'PENDING' check (status in ('PENDING','SUCCESSFUL','FAILED','CANCELLED','REFUNDED')),
  verified boolean not null default false,
  created_at timestamptz default now(),
  verified_at timestamptz
);
alter table public.payments enable row level security;
drop policy if exists "payments_select" on public.payments;
drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_select" on public.payments for select using (auth.role() = 'authenticated');
-- Inserts/updates from the public checkout flow only ever happen through the
-- verify-payment Edge Function (using the service role, which bypasses RLS
-- entirely) - so there is deliberately no anon insert/update policy here.
create policy "payments_admin_write" on public.payments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists payments_tx_ref_idx on public.payments (tx_ref);

-- ---------------------------------------------------------------
-- TABLE: notifications (admin-facing, realtime + sound)
-- ---------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new_request','payment_confirmed','status_update')),
  title text not null,
  body text default '',
  request_id uuid references public.requests(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_select" on public.notifications for select using (auth.role() = 'authenticated');
create policy "notifications_update" on public.notifications for update using (auth.role() = 'authenticated');
-- No client-role insert policy - notifications are only ever created by
-- SECURITY DEFINER triggers/functions below, never directly by a client.

create or replace function public.notify_new_request()
returns trigger as $$
begin
  insert into public.notifications (type, title, body, request_id)
  values (
    'new_request',
    'New admission request',
    new.full_name || ' submitted a request for ' || coalesce(new.programme_name, 'a programme') || '. Request ID: ' || new.request_number,
    new.id
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_new_request on public.requests;
create trigger trg_notify_new_request
after insert on public.requests
for each row execute function public.notify_new_request();

create or replace function public.notify_payment_confirmed()
returns trigger as $$
begin
  if new.status = 'SUCCESSFUL' and (old.status is distinct from new.status) then
    insert into public.notifications (type, title, body, request_id)
    values (
      'payment_confirmed',
      'Payment confirmed',
      coalesce(new.client_name, 'A client') || ' successfully paid ' || new.amount || ' ' || new.currency || '.',
      new.request_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_payment on public.payments;
create trigger trg_notify_payment
after update on public.payments
for each row execute function public.notify_payment_confirmed();

-- ---------------------------------------------------------------
-- REALTIME: add the tables the Admin Portal needs to watch live.
-- (Equivalent to toggling "Enable Realtime" per table in the Supabase
-- dashboard under Database > Replication - done here via SQL instead.)
-- ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'requests'
  ) then
    alter publication supabase_realtime add table public.requests;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;

-- ---------------------------------------------------------------
-- UPDATED create_request RPC - now also stores the full assessment detail.
-- Replaces the v2 version (same function name/signature, so nothing else
-- needs to change) with support for JAMB/O'Level subjects and aggregate.
-- ---------------------------------------------------------------
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
    terms_accepted, terms_accepted_at, terms_version,
    jamb_subjects, olevel_subjects, olevel_sittings, olevel_score,
    one_sitting_bonus_applied, jamb_contribution, olevel_contribution, aggregate
  ) values (
    payload->>'full_name', payload->>'phone', payload->>'email', payload->>'jamb_reg_number',
    nullif(payload->>'jamb_score','')::int,
    coalesce(payload->>'institution', 'University of Nigeria, Nsukka'),
    nullif(payload->>'programme_id','')::uuid, payload->>'programme_name', payload->>'programme_grade',
    payload->>'working_type', coalesce((payload->>'price')::numeric, 0),
    payload->>'eligibility_status', payload->>'benchmark_status', payload->>'recommendation',
    payload->>'additional_notes', true, now(), coalesce(payload->>'terms_version', 'v1'),
    coalesce(payload->'jamb_subjects', '[]'::jsonb), coalesce(payload->'olevel_subjects', '[]'::jsonb),
    coalesce((payload->>'olevel_sittings')::int, 1), coalesce((payload->>'olevel_score')::numeric, 0),
    coalesce((payload->>'one_sitting_bonus_applied')::numeric, 0),
    coalesce((payload->>'jamb_contribution')::numeric, 0), coalesce((payload->>'olevel_contribution')::numeric, 0),
    coalesce((payload->>'aggregate')::numeric, 0)
  )
  returning * into new_row;

  return jsonb_build_object(
    'id', new_row.id,
    'request_number', new_row.request_number,
    'programme_name', new_row.programme_name,
    'working_type', new_row.working_type,
    'price', new_row.price,
    'status', new_row.status,
    'eligibility_status', new_row.eligibility_status,
    'aggregate', new_row.aggregate
  );
end;
$$;
grant execute on function public.create_request(jsonb) to anon, authenticated;

-- Public-safe fetch of the configurable aggregate model + subject lists +
-- grade conversion, so the Client Portal can calculate live without needing
-- any authenticated access.
create or replace function public.get_assessment_config()
returns jsonb
language sql security definer set search_path = public stable
as $$
  select jsonb_build_object(
    'aggregate_settings', (select to_jsonb(a) from public.aggregate_settings a where id = 1),
    'jamb_subjects', (select coalesce(jsonb_agg(name order by sort_order), '[]'::jsonb) from public.jamb_subjects),
    'olevel_subjects', (select coalesce(jsonb_agg(name order by sort_order), '[]'::jsonb) from public.olevel_subjects),
    'grade_conversion', (select coalesce(jsonb_object_agg(grade, marks), '{}'::jsonb) from public.grade_conversion)
  );
$$;
grant execute on function public.get_assessment_config() to anon, authenticated;

-- ============================================================
-- DONE. See README for: Edge Function deployment (Flutterwave secret-key
-- verification), WhatsApp number setup, and notification sound setup.
-- ============================================================
