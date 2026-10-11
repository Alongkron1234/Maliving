-- ===================================================
-- Migration 004: lease contracts (contract lifecycle)
-- Run once in the Supabase SQL editor.
--
-- Lifecycle:
--   active --renew-->     renewed     (and a NEW 'active' row is created, pointing back via renewed_from)
--   active --terminate--> terminated
--
-- "Expiring soon" and "expired" are NOT stored. They are worked out from end_date every time
-- we read, so there is no daily job to run and nothing that can go stale (same idea as the
-- 'overdue' bill status).
--
-- This migration only ADDS a new table, so the code currently deployed on main keeps working
-- even though it doesn't know this table exists.
-- ===================================================

create table contracts (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) on delete restrict not null,
  room_id uuid references rooms(id) on delete restrict not null,
  start_date date not null,
  end_date date not null,
  rent_amount integer not null check (rent_amount >= 0),
  deposit_amount integer not null default 0 check (deposit_amount >= 0),
  status text not null default 'active' check (status in ('active', 'renewed', 'terminated')),
  renewed_from uuid references contracts(id) on delete set null,
  terminated_at timestamptz,
  termination_note text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  check (end_date > start_date)
);

-- A tenant can have many contracts over time (that's the history), but only ONE 'active' at a time.
-- A partial unique index enforces this inside the database itself, so even a double-click or a
-- bug in app code can't create two active contracts for the same tenant.
create unique index one_active_contract_per_tenant
  on contracts (tenant_id)
  where status = 'active';

create index contracts_end_date_idx on contracts (end_date);

alter table contracts enable row level security;

create policy "admin: full access on contracts"
  on contracts for all
  using (is_admin());

create policy "tenant: read own contracts"
  on contracts for select
  using (tenant_id in (select my_tenant_ids()));
