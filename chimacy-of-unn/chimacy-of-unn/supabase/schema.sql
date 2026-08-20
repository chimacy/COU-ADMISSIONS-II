-- ============================================================
-- CHIMACY OF UNN — Admission Brokerage Management System
-- Supabase (Postgres) schema, security policies, and seed data
-- Run this entire file once in Supabase SQL Editor after creating your project.
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- TABLE: settings  (single-row global branding & config)
-- ---------------------------------------------------------------
create table if not exists public.settings (
  id integer primary key default 1,
  company_name text not null default 'CHIMACY OF UNN',
  tagline text default 'Your Trusted Admission Consulting Partner',
  institution_name text not null default 'University of Nigeria, Nsukka',
  phone text default '',
  email text default '',
  address text default '',
  logo_url text default '',
  signature_url text default '',
  footer_text text default 'This quotation is generated electronically and is valid for 14 days from the date of issue.',
  currency text default 'NGN',
  currency_symbol text default '₦',
  primary_color text default '#15803d',
  accent_color text default '#facc15',
  updated_at timestamptz default now(),
  constraint settings_singleton check (id = 1)
);
alter table public.settings enable row level security;
drop policy if exists "settings_select" on public.settings;
drop policy if exists "settings_update" on public.settings;
drop policy if exists "settings_insert" on public.settings;
-- Branding is public (logo/name/colors need to render on the Login screen
-- before anyone is authenticated) - only writes require an admin login.
create policy "settings_select" on public.settings for select using (true);
create policy "settings_update" on public.settings for update using (auth.role() = 'authenticated');
create policy "settings_insert" on public.settings for insert with check (auth.role() = 'authenticated');

-- Seed the single settings row (CHIMACY OF UNN branding, green theme)
insert into public.settings (id, company_name, tagline, institution_name, phone, email, address, footer_text, currency, currency_symbol, primary_color, accent_color)
values (1, 'CHIMACY OF UNN', 'Your Trusted Admission Consulting Partner', 'University of Nigeria, Nsukka', '+234 800 000 0000', 'info@chimacyofunn.com', 'University of Nigeria, Nsukka, Enugu State', 'This quotation is generated electronically and is valid for 14 days from the date of issue.', 'NGN', '₦', '#15803d', '#facc15')
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- TABLE: programmes
-- ---------------------------------------------------------------
create table if not exists public.programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text not null,
  price numeric not null default 0,
  double_price numeric not null default 0,
  minimum_score integer default 0,
  preferred_score integer default 0,
  double_working_score integer default 0,
  normal_benchmark text default '',
  double_benchmark text default '',
  price_estimated boolean default false,
  benchmark_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.programmes enable row level security;
drop policy if exists "programmes_select" on public.programmes;
drop policy if exists "programmes_insert" on public.programmes;
drop policy if exists "programmes_update" on public.programmes;
drop policy if exists "programmes_delete" on public.programmes;
create policy "programmes_select" on public.programmes for select using (auth.role() = 'authenticated');
create policy "programmes_insert" on public.programmes for insert with check (auth.role() = 'authenticated');
create policy "programmes_update" on public.programmes for update using (auth.role() = 'authenticated');
create policy "programmes_delete" on public.programmes for delete using (auth.role() = 'authenticated');

-- Seed programmes (your real pricing guide)
insert into public.programmes (name, grade, price, double_price, minimum_score, preferred_score, double_working_score, normal_benchmark, double_benchmark, price_estimated, benchmark_default) values
('Medicine & Surgery', 'First Grade', 2800000, 5000000, 260, 285, 260, '285 - 300 & Above', '260-284', false, false),
('Pharmacy', 'First Grade', 2000000, 3500000, 245, 260, 245, '260 - 270 & Above', '245-259', false, false),
('Dentistry', 'First Grade', 1800000, 3500000, 230, 250, 230, '250 - 260 & Above', '230-249', false, false),
('Law', 'First Grade', 1700000, 3000000, 220, 230, 220, '230 - 250 & Above', '220-229', false, false),
('Nursing', 'First Grade', 2700000, 4700000, 250, 265, 250, '265 - 280 & Above', '250-264', false, false),
('Radiography', 'First Grade', 1000000, 1700000, 200, 220, 200, '220 - 230 & Above', '200-219', false, false),
('Medical Laboratory Science', 'Second Grade Grade I', 800000, 1300000, 180, 200, 180, '200 - 210 & Above', '180-199', false, false),
('Medical Rehabilitation', 'Second Grade Grade I', 800000, 1300000, 160, 190, 160, '190 - 200 & Above', '160-189 (Extra Commitment)', false, false),
('Computer Science', 'Second Grade Grade I', 800000, 1300000, 160, 190, 160, '190 - 200 & Above', '160-189', false, false),
('Mechatronics Engineering', 'Second Grade Grade I', 800000, 1300000, 180, 200, 180, '200 - 220 & Above', '180-199', false, false),
('Mechanical Engineering', 'Second Grade Grade I', 800000, 1300000, 170, 190, 170, '190 - 200 & Above', '170-189', false, false),
('Electronics & Computer Engineering', 'Second Grade Grade I', 800000, 1300000, 160, 190, 160, '190 - 200 & Above', '160-189', false, false),
('Physiotherapy', 'Second Grade Grade I', 800000, 1300000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', false, true),
('Veterinary Medicine', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Human Anatomy', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Civil Engineering', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Electrical Engineering', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Accountancy', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Biomedical Engineering', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Nutrition & Dietetics', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Human Physiology', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Biochemistry', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Architecture', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Criminology', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Social Work', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Economics', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Political Science', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('English & Literature', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Theatre Arts', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Mass Communication', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('History and International Relations', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Education & English Language', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Public Administration', 'Second Grade Grade II', 600000, 950000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Food Science and Technology', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Microbiology', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Genetics & Biotechnology', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Computer & Statistics', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Science Laboratory Technology', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Pure & Industrial Chemistry', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Surveying & Geo-informatics', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Computer Education', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Foreign Languages (French, German, Russian)', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Linguistics', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Business Management', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Banking & Finance', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Creative Arts', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Education Economics', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Education Biology', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Education Chemistry', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Metallurgical & Materials Engineering', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Psychology', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Sociology', 'Third Grade', 400000, 650000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Guidance & Counselling', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Home Science', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Music', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Archaeology', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Animal Science', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Crop Science', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Agricultural Economics', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Tourism Studies', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Philosophy', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Botany', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Zoology', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Biological Sciences', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Marketing', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Agricultural Engineering', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Mathematics', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Statistics', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Physics & Astronomy', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Fine Arts', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Education Physics', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Education Fine Arts', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Library & Information Science', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Human Kinetics & Health Education', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Business Education', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true),
('Education Geography', 'Fourth Grade', 250000, 400000, 140, 160, 140, '160 & Above (Default)', '140-159 (Default)', true, true);

-- ---------------------------------------------------------------
-- TABLE: rules
-- ---------------------------------------------------------------
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  title text default '',
  body text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table public.rules enable row level security;
drop policy if exists "rules_select" on public.rules;
drop policy if exists "rules_insert" on public.rules;
drop policy if exists "rules_update" on public.rules;
drop policy if exists "rules_delete" on public.rules;
create policy "rules_select" on public.rules for select using (auth.role() = 'authenticated');
create policy "rules_insert" on public.rules for insert with check (auth.role() = 'authenticated');
create policy "rules_update" on public.rules for update using (auth.role() = 'authenticated');
create policy "rules_delete" on public.rules for delete using (auth.role() = 'authenticated');

-- Seed rules (your exact wording)
insert into public.rules (title, body, sort_order) values
('Commitment Policy', 'Decision on choices made cannot be changed after commitment and execution, except on peculiar medical cases.', 0),
('Refund Timing', 'Refund can only be done after the end of the whole process and 2 weeks after ceremonies have been conducted, and can only be approved in rare cases where a tangible outcome of justification is released.', 1),
('Consultation Fee', 'A consultation fee of ₦5,000 must be made by only serious clients for inquiry, before acting on behalf of the client.', 2),
('Full Payment Requirement', 'Payments must be made in full for First Grade and Second Grade programmes, and at least an 80% deposit for Third and Fourth Grade programmes, ensuring trust that the client will complete payment after success.', 3),
('Refund Percentage', 'Obtainable refund policy is 90%, depending on the chosen programme package, if conditions are not met.', 4),
('Benchmark Compliance', 'Must ensure the client meets all internal hidden benchmarks for their programme choice(s) before commitment.', 5);

-- ---------------------------------------------------------------
-- TABLE: quotations  (client records / quotations / invoices)
-- ---------------------------------------------------------------
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text unique,
  client_name text not null,
  parent_name text default '',
  phone text default '',
  email text default '',
  jamb_reg_number text default '',
  jamb_score integer,
  programme_id uuid references public.programmes(id) on delete set null,
  programme_name text default '',
  programme_grade text default '',
  working_type text default '',
  price numeric default 0,
  status text default '',
  benchmark_status text default '',
  recommendation text default '',
  category text default 'New Application',
  remarks text default '',
  quote_date date default current_date,
  rules_snapshot jsonb,
  paid boolean default false,
  paid_amount numeric default 0,
  paid_date date,
  payment_method text default '',
  invoice_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);
alter table public.quotations enable row level security;
drop policy if exists "quotations_select" on public.quotations;
drop policy if exists "quotations_insert" on public.quotations;
drop policy if exists "quotations_update" on public.quotations;
drop policy if exists "quotations_delete" on public.quotations;
create policy "quotations_select" on public.quotations for select using (auth.role() = 'authenticated');
create policy "quotations_insert" on public.quotations for insert with check (auth.role() = 'authenticated');
create policy "quotations_update" on public.quotations for update using (auth.role() = 'authenticated');
create policy "quotations_delete" on public.quotations for delete using (auth.role() = 'authenticated');

-- Auto-generate a sequential quotation number (ABMS-style -> CHM-2026-0001)
create sequence if not exists public.quotation_number_seq start 1;
create or replace function public.set_quotation_number()
returns trigger as $$
begin
  if new.quotation_number is null then
    new.quotation_number := 'CHM-' || extract(year from now())::text || '-' || lpad(nextval('public.quotation_number_seq')::text, 4, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_quotation_number on public.quotations;
create trigger trg_set_quotation_number
before insert on public.quotations
for each row execute function public.set_quotation_number();

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_quotations on public.quotations;
create trigger trg_touch_quotations
before update on public.quotations
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- STORAGE: bucket for logo / signature uploads
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('branding', 'branding', true) on conflict (id) do nothing;

drop policy if exists "branding_public_read" on storage.objects;
drop policy if exists "branding_auth_write" on storage.objects;
create policy "branding_public_read" on storage.objects for select using (bucket_id = 'branding');
create policy "branding_auth_write" on storage.objects for insert with check (bucket_id = 'branding' and auth.role() = 'authenticated');
create policy "branding_auth_update" on storage.objects for update using (bucket_id = 'branding' and auth.role() = 'authenticated');
create policy "branding_auth_delete" on storage.objects for delete using (bucket_id = 'branding' and auth.role() = 'authenticated');

-- ============================================================
-- DONE. Next: Authentication > Users > Add User to create admin logins.
-- (Email confirmations can be disabled in Auth settings for internal-only admin accounts.)
-- ============================================================
