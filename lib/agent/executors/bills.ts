import { getEffectiveBillStatus } from '@/lib/bills'
import { resolveRoomId, internalFetch, type ExecutorCtx, type ToolArgs } from './types'
import type { BillStatus } from '@/lib/types/database'

export async function list_bills(args: ToolArgs, ctx: ExecutorCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (ctx.supabase as any)
    .from('bills')
    .select('id, billing_month, billing_year, rent_amount, electric_amount, water_amount, total_amount, status, due_date, rooms(room_number), tenants(profiles(full_name))')
    .order('billing_year', { ascending: false })
    .order('billing_month', { ascending: false })
  if (args.month) query = query.eq('billing_month', args.month)
  if (args.year) query = query.eq('billing_year', args.year)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withStatus = (data ?? []).map((b: any) => ({
    ...b,
    effective_status: getEffectiveBillStatus({ status: b.status, due_date: b.due_date }),
  }))

  if (args.status) {
    return withStatus.filter((b: { effective_status: BillStatus }) => b.effective_status === args.status)
  }
  return withStatus
}

export async function get_bill(args: ToolArgs, ctx: ExecutorCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from('bills')
    .select('*, rooms(room_number), tenants(profiles(full_name, phone))')
    .eq('id', args.bill_id)
    .single()
  if (error || !data) throw new Error('ไม่พบบิลนี้')
  return { ...data, effective_status: getEffectiveBillStatus({ status: data.status, due_date: data.due_date }) }
}

export async function generate_bill(args: ToolArgs, ctx: ExecutorCtx) {
  const room_id = args.room_number ? await resolveRoomId(ctx.supabase, args) : undefined
  return internalFetch(ctx.origin, '/api/admin/generate-bills', {
    method: 'POST',
    body: JSON.stringify({
      month: args.month,
      year: args.year,
      electric_rate: args.electric_rate ?? 8,
      water_rate: args.water_rate ?? 18,
      room_id,
    }),
  })
}

export async function delete_bill(args: ToolArgs, ctx: ExecutorCtx) {
  return internalFetch(ctx.origin, `/api/admin/delete-bill?id=${encodeURIComponent(args.bill_id)}`, { method: 'DELETE' })
}
