import { resolveRoomId, internalFetch, type ExecutorCtx, type ToolArgs } from './types'

export async function list_tenants(args: ToolArgs, ctx: ExecutorCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (ctx.supabase as any)
    .from('tenants')
    .select('id, move_in_date, move_out_date, status, profile_id, room_id, profiles(full_name, phone), rooms(room_number, floor)')
    .order('move_in_date', { ascending: false })
  if (args.status) query = query.eq('status', args.status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

async function findTenant(ctx: ExecutorCtx, args: ToolArgs) {
  const supabase = ctx.supabase
  if (args.tenant_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('tenants')
      .select('id, move_in_date, move_out_date, status, profile_id, room_id, profiles(id, full_name, phone), rooms(room_number)')
      .eq('id', args.tenant_id)
      .single()
    if (error || !data) throw new Error('ไม่พบผู้เช่านี้')
    return data
  }
  if (args.room_number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: room } = await (supabase as any).from('rooms').select('id').eq('room_number', args.room_number).single()
    if (!room) throw new Error(`ไม่พบห้อง "${args.room_number}"`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('tenants')
      .select('id, move_in_date, move_out_date, status, profile_id, room_id, profiles(id, full_name, phone), rooms(room_number)')
      .eq('room_id', room.id)
      .eq('status', 'active')
      .order('move_in_date', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error || !data) throw new Error(`ไม่พบผู้เช่าที่ยัง active ในห้อง "${args.room_number}"`)
    return data
  }
  if (args.phone) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any).from('profiles').select('id').eq('phone', args.phone).eq('role', 'tenant').maybeSingle()
    if (!profile) throw new Error(`ไม่พบผู้เช่าเบอร์ "${args.phone}"`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('tenants')
      .select('id, move_in_date, move_out_date, status, profile_id, room_id, profiles(id, full_name, phone), rooms(room_number)')
      .eq('profile_id', profile.id)
      .order('move_in_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) throw new Error('ไม่พบข้อมูลผู้เช่า')
    return data
  }
  throw new Error('ต้องระบุ tenant_id, room_number หรือ phone')
}

export async function get_tenant(args: ToolArgs, ctx: ExecutorCtx) {
  const tenant = await findTenant(ctx, args)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bills } = await (ctx.supabase as any)
    .from('bills')
    .select('id, billing_month, billing_year, total_amount, status, due_date')
    .eq('tenant_id', tenant.id)
    .order('billing_year', { ascending: false })
    .order('billing_month', { ascending: false })
    .limit(12)
  return { ...tenant, recent_bills: bills ?? [] }
}

export async function create_tenant(args: ToolArgs, ctx: ExecutorCtx) {
  const room_id = await resolveRoomId(ctx.supabase, args)
  return internalFetch(ctx.origin, '/api/admin/create-tenant', {
    method: 'POST',
    body: JSON.stringify({
      full_name: args.full_name,
      phone: args.phone ?? null,
      email: args.email,
      password: args.password,
      room_id,
      move_in_date: args.move_in_date,
    }),
  })
}

export async function update_tenant(args: ToolArgs, ctx: ExecutorCtx) {
  const tenant = await findTenant(ctx, { tenant_id: args.tenant_id })
  const supabase = ctx.supabase

  if (args.full_name != null || args.phone != null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('profiles')
      .update({
        ...(args.full_name != null ? { full_name: args.full_name } : {}),
        ...(args.phone != null ? { phone: args.phone } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenant.profile_id)
    if (error) throw new Error(error.message)
  }

  if (args.move_in_date != null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('tenants')
      .update({ move_in_date: args.move_in_date, updated_at: new Date().toISOString() })
      .eq('id', tenant.id)
    if (error) throw new Error(error.message)
  }

  return { ok: true }
}

export async function move_out_tenant(args: ToolArgs, ctx: ExecutorCtx) {
  const tenant = await findTenant(ctx, { tenant_id: args.tenant_id })
  return internalFetch(ctx.origin, '/api/admin/remove-tenant', {
    method: 'POST',
    body: JSON.stringify({ tenant_id: tenant.id, profile_id: tenant.profile_id, room_id: tenant.room_id }),
  })
}

export async function reset_tenant_password(args: ToolArgs, ctx: ExecutorCtx) {
  return internalFetch(ctx.origin, '/api/admin/reset-tenant-password', {
    method: 'POST',
    body: JSON.stringify({ profile_id: args.profile_id, password: args.password }),
  })
}
