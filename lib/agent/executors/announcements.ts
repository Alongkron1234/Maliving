import type { ExecutorCtx, ToolArgs } from './types'

export async function list_announcements(_args: ToolArgs, ctx: ExecutorCtx) {
  const { data, error } = await ctx.supabase
    .from('announcements')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function create_announcement(args: ToolArgs, ctx: ExecutorCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from('announcements')
    .insert({ title: args.title, body: args.body, is_pinned: args.is_pinned ?? false })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function update_announcement(args: ToolArgs, ctx: ExecutorCtx) {
  const { data: current, error: fetchError } = await ctx.supabase
    .from('announcements')
    .select('title, body, is_pinned')
    .eq('id', args.announcement_id)
    .single() as { data: { title: string; body: string; is_pinned: boolean } | null; error: unknown }
  if (fetchError || !current) throw new Error('ไม่พบประกาศนี้')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from('announcements')
    .update({
      title: args.title ?? current.title,
      body: args.body ?? current.body,
      is_pinned: args.is_pinned ?? current.is_pinned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.announcement_id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function delete_announcement(args: ToolArgs, ctx: ExecutorCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any).from('announcements').delete().eq('id', args.announcement_id)
  if (error) throw new Error(error.message)
  return { ok: true }
}

export async function toggle_pin_announcement(args: ToolArgs, ctx: ExecutorCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from('announcements')
    .update({ is_pinned: args.is_pinned, updated_at: new Date().toISOString() })
    .eq('id', args.announcement_id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
