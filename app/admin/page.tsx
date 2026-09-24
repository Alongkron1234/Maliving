import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Plus,
  Wallet,
  BedDouble,
  Users,
  Wrench,
  Receipt,
  AlertTriangle,
  Gauge,
  type LucideIcon,
} from 'lucide-react'
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

  const thaiDate = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-[#904d00] uppercase tracking-widest mb-1">{thaiDate}</p>
          <h1 className="text-3xl font-bold text-[#241912] tracking-tight">แดชบอร์ด</h1>
          <p className="text-sm text-[#897362] mt-1.5">ภาพรวมระบบจัดการหอพัก Maliving</p>
        </div>
        <Link
          href="/admin/rooms/new"
          className="inline-flex items-center justify-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#ff8c00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
        >
          <Plus size={16} />
          เพิ่มห้องพัก
        </Link>
      </div>

      {/* Finance */}
      <SectionLabel>ภาพรวมการเงิน</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Wallet}
          tone="success"
          label="รายได้เดือนนี้"
          value={`฿${revenueThisMonth.toLocaleString('th-TH')}`}
          note="จากยอดชำระที่รับแล้ว"
        />
        <StatCard
          icon={Receipt}
          tone={unpaidCount > 0 ? 'warning' : 'neutral'}
          label="บิลค้างชำระ"
          value={unpaidCount}
          note={`รวม ฿${unpaidTotal.toLocaleString('th-TH')}`}
        />
        <StatCard
          icon={AlertTriangle}
          tone={overdueCount > 0 ? 'danger' : 'neutral'}
          label="บิลเกินกำหนด"
          value={overdueCount}
          note={`รวม ฿${overdueTotal.toLocaleString('th-TH')}`}
        />
      </div>

      {/* Operations */}
      <SectionLabel>การดำเนินงาน</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BedDouble}
          tone="brand"
          label="อัตราการเข้าพัก"
          value={`${occupancyRate}%`}
          note={`${occupiedRooms} จาก ${totalRooms} ห้อง`}
        />
        <StatCard
          icon={Users}
          tone="neutral"
          label="ผู้เช่าทั้งหมด"
          value={tenantCount ?? 0}
          note="Active residents"
        />
        <StatCard
          icon={Wrench}
          tone={(maintenanceCount ?? 0) > 0 ? 'warning' : 'neutral'}
          label="แจ้งซ่อมรอดำเนินการ"
          value={maintenanceCount ?? 0}
          note={highPriorityCount ? `${highPriorityCount} รายการเร่งด่วน` : 'ไม่มีรายการเร่งด่วน'}
        />
        <StatCard
          icon={Gauge}
          tone={missingMeterCount > 0 ? 'warning' : 'neutral'}
          label="มิเตอร์ค้างบันทึก"
          value={missingMeterCount}
          note="ห้องที่ยังไม่ได้กรอกมิเตอร์เดือนนี้"
        />
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-bold text-[#897362] uppercase tracking-widest mb-3">{children}</h2>
}

const toneStyles = {
  brand:   { icon: 'bg-[#fff1e9] text-[#904d00]', value: 'text-[#241912]' },
  success: { icon: 'bg-[#e3f5ea] text-[#1e7e46]', value: 'text-[#241912]' },
  warning: { icon: 'bg-[#fff1e9] text-[#ff8c00]', value: 'text-[#ff8c00]' },
  danger:  { icon: 'bg-[#ffdad6] text-[#ba1a1a]', value: 'text-[#ba1a1a]' },
  neutral: { icon: 'bg-[#f3dfd1] text-[#564334]', value: 'text-[#241912]' },
} as const

function StatCard({
  icon: Icon,
  tone = 'neutral',
  label,
  value,
  note,
}: {
  icon: LucideIcon
  tone?: keyof typeof toneStyles
  label: string
  value: number | string
  note: string
}) {
  const styles = toneStyles[tone]
  return (
    <div className="group bg-white rounded-2xl p-5 border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] transition-all hover:shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${styles.icon}`}>
          <Icon size={18} strokeWidth={2.25} />
        </span>
      </div>
      <p className="text-xs font-semibold text-[#897362] uppercase tracking-wide">{label}</p>
      <p className={`text-[28px] leading-tight font-bold mt-1.5 ${styles.value}`}>
        {typeof value === 'number' ? value.toLocaleString('th-TH') : value}
      </p>
      <p className="text-xs text-[#897362] mt-1.5 truncate">{note}</p>
    </div>
  )
}
