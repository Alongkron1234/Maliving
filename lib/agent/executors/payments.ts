import { internalFetch, type ExecutorCtx, type ToolArgs } from './types'

export async function list_payments(args: ToolArgs, ctx: ExecutorCtx) {
  const now = new Date()
  const month = args.month ?? now.getMonth() + 1
  const year = args.year ?? now.getFullYear()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (ctx.supabase as any)
    .from('payments')
    .select('id, amount, method, paid_at, bill_id, bills!inner(billing_month, billing_year, rooms(room_number)), tenants(profiles(full_name))')
    .order('paid_at', { ascending: false })

  if (!args.all) {
    query = query.eq('bills.billing_month', month).eq('bills.billing_year', year)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function record_payment(args: ToolArgs, ctx: ExecutorCtx) {
  return internalFetch(ctx.origin, '/api/admin/record-payment', {
    method: 'POST',
    body: JSON.stringify({ bill_id: args.bill_id, method: args.method, paid_at: args.paid_at ?? null }),
  })
}

export async function undo_payment(args: ToolArgs, ctx: ExecutorCtx) {
  return internalFetch(ctx.origin, `/api/admin/record-payment?bill_id=${encodeURIComponent(args.bill_id)}`, { method: 'DELETE' })
}
