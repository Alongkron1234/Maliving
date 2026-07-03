import { resolveRoomId, type ExecutorCtx, type ToolArgs } from './types'

export async function list_maintenance_requests(args: ToolArgs, ctx: ExecutorCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (ctx.supabase as any)
    .from('maintenance_requests')
    .select('id, title, description, status, priority, created_at, rooms(room_number)')
    .order('created_at', { ascending: false })
  if (args.status) query = query.eq('status', args.status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function create_maintenance_request(args: ToolArgs, ctx: ExecutorCtx) {
  const room_id = await resolveRoomId(ctx.supabase, args)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from('maintenance_requests')
    .insert({
      room_id,
      title: args.title,
      description: args.description ?? null,
      priority: args.priority ?? 'medium',
      status: 'open',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function update_maintenance_status(args: ToolArgs, ctx: ExecutorCtx) {
  const { data: current, error: fetchError } = await ctx.supabase
    .from('maintenance_requests')
    .select('status, priority')
    .eq('id', args.request_id)
    .single() as { data: { status: string; priority: string } | null; error: unknown }
  if (fetchError || !current) throw new Error('ไม่พบรายการแจ้งซ่อมนี้')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from('maintenance_requests')
    .update({
      status: args.status ?? current.status,
      priority: args.priority ?? current.priority,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.request_id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function delete_maintenance_request(args: ToolArgs, ctx: ExecutorCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any).from('maintenance_requests').delete().eq('id', args.request_id)
  if (error) throw new Error(error.message)
  return { ok: true }
}
