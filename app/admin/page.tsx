import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getEffectiveBillStatus } from '@/lib/bills'

export default async function AdminDashboard() {
  const supabase = await createClient()

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
    supabase.from('payments').select('amount').gte('paid_at', firstOfMonth).lt('paid_at', firstOfNextMonth) as unknown as Promise<{ data: { amount: number }[] | null }>,
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

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#241912]">แดชบอร์ด</h1>
          <p className="text-sm text-[#897362] mt-1">ภาพรวมระบบจัดการหอพัก Maliving</p>
        </div>
        <Link
          href="/admin/rooms/new"
          className="flex items-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          เพิ่มห้องพัก
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="รายได้เดือนนี้"
          value={`฿${revenueThisMonth.toLocaleString('th-TH')}`}
          note="จากยอดชำระที่รับแล้ว"
        />
        <StatCard
          label="อัตราการเข้าพัก"
          value={`${occupancyRate}%`}
          note={`${occupiedRooms} จาก ${totalRooms} ห้อง`}
        />
        <StatCard label="ผู้เช่าทั้งหมด" value={tenantCount ?? 0} note="Active residents" />
        <StatCard
          label="แจ้งซ่อมรอดำเนินการ"
          value={maintenanceCount ?? 0}
          note={highPriorityCount ? `${highPriorityCount} รายการเร่งด่วน` : 'รายการ'}
          alert={(maintenanceCount ?? 0) > 0}
        />
        <StatCard
          label="บิลค้างชำระ"
          value={unpaidCount}
          note={`รวม ${unpaidTotal.toLocaleString('th-TH')} บาท`}
          alert={unpaidCount > 0}
        />
        <StatCard
          label="บิลเกินกำหนด"
          value={overdueCount}
          note={`รวม ${overdueTotal.toLocaleString('th-TH')} บาท`}
          alert={overdueCount > 0}
        />
        <StatCard
          label="มิเตอร์ค้างบันทึก"
          value={missingMeterCount}
          note="ห้องที่ยังไม่ได้กรอกมิเตอร์เดือนนี้"
          alert={missingMeterCount > 0}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  note,
  alert = false,
}: {
  label: string
  value: number | string
  note: string
  alert?: boolean
}) {
  return (
    <div className="bg-[#fff1e9] rounded-xl p-5 border border-[#ddc1ae]">
      <p className="text-xs font-semibold text-[#897362] uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${alert ? 'text-[#ff8c00]' : 'text-[#241912]'}`}>
        {typeof value === 'number' ? value.toLocaleString('th-TH') : value}
      </p>
      <p className="text-xs text-[#897362] mt-1">{note}</p>
    </div>
  )
}
