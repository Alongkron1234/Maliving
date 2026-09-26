import { getEffectiveBillStatus } from '@/lib/bills'
import type { ExecutorCtx, ToolArgs } from './types'

export async function get_dashboard_stats(_args: ToolArgs, ctx: ExecutorCtx) {
  const supabase = ctx.supabase
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const firstOfMonth = new Date(currentYear, now.getMonth(), 1).toISOString()
  const firstOfNextMonth = new Date(currentYear, now.getMonth() + 1, 1).toISOString()

  const [
    { data: rooms },
    { data: unpaidBills },
    { data: paymentsThisMonth },
    { count: maintenanceCount },
    { count: highPriorityCount },
    { count: tenantCount },
    { data: activeTenantRooms },
    { data: readingsThisMonth },
  ] = await Promise.all([
    supabase.from('rooms').select('status') as unknown as Promise<{ data: { status: string }[] | null }>,
    supabase.from('bills').select('total_amount, due_date').eq('status', 'unpaid') as unknown as Promise<{ data: { total_amount: number; due_date: string | null }[] | null }>,
    supabase.from('payments').select('amount').eq('status', 'confirmed').gte('paid_at', firstOfMonth).lt('paid_at', firstOfNextMonth) as unknown as Promise<{ data: { amount: number }[] | null }>,
    supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']).eq('priority', 'high'),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tenants').select('room_id').eq('status', 'active') as unknown as Promise<{ data: { room_id: string }[] | null }>,
    supabase.from('meter_readings').select('room_id, meter_type').eq('reading_month', currentMonth).eq('reading_year', currentYear) as unknown as Promise<{ data: { room_id: string; meter_type: string }[] | null }>,
  ])

  const totalRooms = rooms?.length ?? 0
  const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length ?? 0
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  const unpaidCount = unpaidBills?.length ?? 0
  const unpaidTotal = unpaidBills?.reduce((sum, b) => sum + (b.total_amount ?? 0), 0) ?? 0

  const overdueBills = (unpaidBills ?? []).filter(b => getEffectiveBillStatus({ status: 'unpaid', due_date: b.due_date }) === 'overdue')
  const overdueCount = overdueBills.length
  const overdueTotal = overdueBills.reduce((sum, b) => sum + (b.total_amount ?? 0), 0)

  const revenueThisMonth = paymentsThisMonth?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0

  const roomsWithActiveTenant = new Set((activeTenantRooms ?? []).map(t => t.room_id))
  const readingTypesByRoom: Record<string, Set<string>> = {}
  for (const r of readingsThisMonth ?? []) {
    if (!readingTypesByRoom[r.room_id]) readingTypesByRoom[r.room_id] = new Set()
    readingTypesByRoom[r.room_id].add(r.meter_type)
  }
  const missingMeterCount = [...roomsWithActiveTenant].filter(roomId => {
    const types = readingTypesByRoom[roomId]
    return !(types?.has('electric') && types?.has('water'))
  }).length

  return {
    currentMonth,
    currentYear,
    revenueThisMonth,
    occupancyRate,
    occupiedRooms,
    totalRooms,
    tenantCount: tenantCount ?? 0,
    maintenanceCount: maintenanceCount ?? 0,
    highPriorityMaintenanceCount: highPriorityCount ?? 0,
    unpaidBillCount: unpaidCount,
    unpaidBillTotal: unpaidTotal,
    overdueBillCount: overdueCount,
    overdueBillTotal: overdueTotal,
    missingMeterRoomCount: missingMeterCount,
  }
}
