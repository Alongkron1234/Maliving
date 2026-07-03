import { resolveRoomId, internalFetch, type ExecutorCtx, type ToolArgs } from './types'

export async function list_rooms(args: ToolArgs, ctx: ExecutorCtx) {
  let query = ctx.supabase.from('rooms').select('id, room_number, floor, rent_price, status').order('room_number')
  if (args.status) query = query.eq('status', args.status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function get_room(args: ToolArgs, ctx: ExecutorCtx) {
  const room_id = await resolveRoomId(ctx.supabase, args)
  const { data: room, error } = await ctx.supabase.from('rooms').select('*').eq('id', room_id).single() as {
    data: Record<string, unknown> | null
    error: unknown
  }
  if (error || !room) throw new Error('ไม่พบห้องนี้')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tenants } = await (ctx.supabase as any)
    .from('tenants')
    .select('id, move_in_date, status, profiles(full_name, phone)')
    .eq('room_id', room_id)
    .eq('status', 'active')

  return { ...room, active_tenants: tenants ?? [] }
}

export async function create_room(args: ToolArgs, ctx: ExecutorCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from('rooms')
    .insert({
      room_number: args.room_number,
      floor: args.floor ?? null,
      rent_price: args.rent_price,
      status: args.status ?? 'available',
    })
    .select()
    .single()
  if (error) throw new Error(error.message.includes('unique') ? `ห้อง "${args.room_number}" มีอยู่แล้ว` : error.message)
  return data
}

export async function update_room(args: ToolArgs, ctx: ExecutorCtx) {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (args.room_number != null) updates.room_number = args.room_number
  if (args.floor != null) updates.floor = args.floor
  if (args.rent_price != null) updates.rent_price = args.rent_price
  if (args.status != null) updates.status = args.status

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from('rooms')
    .update(updates)
    .eq('id', args.room_id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function delete_room(args: ToolArgs, ctx: ExecutorCtx) {
  return internalFetch(ctx.origin, `/api/admin/delete-room?id=${encodeURIComponent(args.room_id)}`, { method: 'DELETE' })
}
