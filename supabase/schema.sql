-- =============================================================
-- Maliving — Database Schema
-- รัน SQL นี้ใน Supabase SQL Editor ทีละ section ตามลำดับ
-- =============================================================

-- =============================================================
-- STEP 1: Extensions
-- =============================================================
create extension if not exists "uuid-ossp";


-- =============================================================
-- STEP 2: Tables (ลำดับตาม FK dependency)
-- =============================================================

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  avatar_url text,
  role text not null default 'tenant' check (role in ('admin', 'tenant')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table rooms (
  id uuid default gen_random_uuid() primary key,
  room_number text not null unique,
  floor integer,
  rent_price integer not null,
  status text not null default 'available' check (status in ('available', 'occupied', 'maintenance')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table tenants (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  room_id uuid references rooms(id) on delete restrict not null,
  move_in_date date not null,
  move_out_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table announcements (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references profiles(id) on delete set null,
  title text not null,
  body text not null,
  is_pinned boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table maintenance_requests (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete restrict not null,
  reported_by uuid references profiles(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table ocr_batches (
  id uuid default gen_random_uuid() primary key,
  uploaded_by uuid references profiles(id) on delete set null,
  image_url text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  reading_month integer check (reading_month between 1 and 12),
  reading_year integer,
  raw_result jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table meter_readings (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete restrict not null,
  ocr_batch_id uuid references ocr_batches(id) on delete set null,
  meter_type text not null check (meter_type in ('electric', 'water')),
  reading_month integer not null check (reading_month between 1 and 12),
  reading_year integer not null,
  previous_reading integer not null default 0,
  current_reading integer not null,
  units_used integer generated always as (current_reading - previous_reading) stored,
  input_method text not null check (input_method in ('manual', 'ocr')),
  created_at timestamptz default now() not null,
  unique (room_id, meter_type, reading_month, reading_year)
);

create table bills (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete restrict not null,
  tenant_id uuid references tenants(id) on delete restrict not null,
  billing_month integer not null check (billing_month between 1 and 12),
  billing_year integer not null,
  rent_amount integer not null,
  electric_amount integer not null default 0,
  water_amount integer not null default 0,
  total_amount integer generated always as (rent_amount + electric_amount + water_amount) stored,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'overdue')),
  due_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (room_id, billing_month, billing_year)
);

create table payments (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references bills(id) on delete restrict not null,
  tenant_id uuid references tenants(id) on delete restrict not null,
  amount integer not null,
  method text not null check (method in ('cash', 'transfer', 'qr')),
  slip_url text,
  paid_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);


-- =============================================================
-- STEP 3: Helper Function สำหรับ RLS
-- =============================================================
create or replace function is_admin()
returns boolean
language sql security definer stable
as $$
  select role = 'admin' from profiles where id = auth.uid()
$$;

-- helper: ดึง room_id ของ tenant ที่ login อยู่ (active)
create or replace function my_room_ids()
returns setof uuid
language sql security definer stable
as $$
  select room_id from tenants
  where profile_id = auth.uid() and status = 'active'
$$;

-- helper: ดึง tenant.id ของ user ที่ login อยู่ (active)
create or replace function my_tenant_ids()
returns setof uuid
language sql security definer stable
as $$
  select id from tenants
  where profile_id = auth.uid() and status = 'active'
$$;


-- =============================================================
-- STEP 4: Trigger — auto-create profile เมื่อ user สมัคร
-- =============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'tenant')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- =============================================================
-- STEP 5: Row Level Security (RLS)
-- =============================================================

-- เปิด RLS ทุกตาราง
alter table profiles enable row level security;
alter table rooms enable row level security;
alter table tenants enable row level security;
alter table announcements enable row level security;
alter table maintenance_requests enable row level security;
alter table ocr_batches enable row level security;
alter table meter_readings enable row level security;
alter table bills enable row level security;
alter table payments enable row level security;

-- -----------------------------------------------
-- profiles
-- -----------------------------------------------
create policy "admin: full access on profiles"
  on profiles for all
  using (is_admin());

create policy "tenant: read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "tenant: update own profile"
  on profiles for update
  using (id = auth.uid());

-- -----------------------------------------------
-- rooms
-- -----------------------------------------------
create policy "admin: full access on rooms"
  on rooms for all
  using (is_admin());

create policy "tenant: read all rooms"
  on rooms for select
  using (auth.uid() is not null);

-- -----------------------------------------------
-- tenants
-- -----------------------------------------------
create policy "admin: full access on tenants"
  on tenants for all
  using (is_admin());

create policy "tenant: read own tenant record"
  on tenants for select
  using (profile_id = auth.uid());

-- -----------------------------------------------
-- announcements
-- -----------------------------------------------
create policy "admin: full access on announcements"
  on announcements for all
  using (is_admin());

create policy "tenant: read all announcements"
  on announcements for select
  using (auth.uid() is not null);

-- -----------------------------------------------
-- maintenance_requests
-- -----------------------------------------------
create policy "admin: full access on maintenance_requests"
  on maintenance_requests for all
  using (is_admin());

create policy "tenant: insert own maintenance request"
  on maintenance_requests for insert
  with check (reported_by = auth.uid());

create policy "tenant: read own maintenance requests"
  on maintenance_requests for select
  using (reported_by = auth.uid());

-- -----------------------------------------------
-- ocr_batches
-- -----------------------------------------------
create policy "admin: full access on ocr_batches"
  on ocr_batches for all
  using (is_admin());

-- -----------------------------------------------
-- meter_readings
-- -----------------------------------------------
create policy "admin: full access on meter_readings"
  on meter_readings for all
  using (is_admin());

create policy "tenant: read meter readings of own room"
  on meter_readings for select
  using (room_id in (select my_room_ids()));

-- -----------------------------------------------
-- bills
-- -----------------------------------------------
create policy "admin: full access on bills"
  on bills for all
  using (is_admin());

create policy "tenant: read bills of own room"
  on bills for select
  using (room_id in (select my_room_ids()));

-- -----------------------------------------------
-- payments
-- -----------------------------------------------
create policy "admin: full access on payments"
  on payments for all
  using (is_admin());

create policy "tenant: insert payment for own bill"
  on payments for insert
  with check (tenant_id in (select my_tenant_ids()));

create policy "tenant: read own payments"
  on payments for select
  using (tenant_id in (select my_tenant_ids()));
