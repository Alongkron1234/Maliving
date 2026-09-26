-- ===================================================
-- Migration 003: tenant slip upload + PromptPay QR payment flow
-- Run this once in the Supabase SQL editor.
-- ===================================================

-- Step 1: extend `payments` so a row can represent an unverified tenant
-- submission (status = 'pending') before an admin confirms it, instead of
-- always meaning "confirmed and paid" the moment it's inserted.
alter table payments
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  add column if not exists note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references profiles(id);

-- Existing rows were all admin-recorded (the only path until now), so they're
-- already confirmed — backfill them instead of leaving them stuck 'pending'.
update payments set status = 'confirmed' where status = 'pending';

-- Step 2: storage bucket for tenant-uploaded payment slip images (private —
-- read access is via short-lived signed URLs only, same as meter-images).
insert into storage.buckets (id, name, public)
values ('payment-slips', 'payment-slips', false)
on conflict (id) do nothing;

-- Admin (service role via API routes) manages everything; tenants may only
-- upload into their own tenant_id-prefixed folder and never read/list/delete.
-- The upload route itself uses the service-role client, so tenants never
-- touch storage directly — this policy is a defense-in-depth backstop.
create policy "admin: full access on payment-slips"
  on storage.objects for all
  using (bucket_id = 'payment-slips' and public.is_admin());
