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
  Camera,
  FileText,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { getEffectiveBillStatus } from '@/lib/bills'

const MONTH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

export default async function AdminDashboard() {
  const supabase = await createClient()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const firstOfMonth = new Date(currentYear, now.getMonth(), 1).toISOString()
  const firstOfNextMonth = new Date(currentYear, now.getMonth() + 1, 1).toISOString()

  // 5-month window (this month + 4 before) for the revenue trend chart
  const trendStart = new Date(currentYear, now.getMonth() - 4, 1).toISOString()

  const [
    { data: rooms },
    { data: unpaidBills },
    { data: paymentsThisMonth },
    { data: openMaintenance },
    { count: maintenanceCount },
    { count: highPriorityCount },
    { count: tenantCount },
    { data: activeTenants },
    { data: readingsThisMonth },
    { data: billsThisMonth },
    { data: trendPayments },
  ] = await Promise.all([
    supabase.from('rooms').select('id, room_number, floor, rent_price, status').order('room_number') as unknown as Promise<{ data: { id: string; room_number: string; floor: number | null; rent_price: number; status: string }[] | null }>,
    supabase.from('bills').select('total_amount, due_date').eq('status', 'unpaid') as unknown as Promise<{ data: { total_amount: number; due_date: string | null }[] | null }>,
    supabase.from('payments').select('amount').gte('paid_at', firstOfMonth).lt('paid_at', firstOfNextMonth) as unknown as Promise<{ data: { amount: number }[] | null }>,
    supabase.from('maintenance_requests').select('id, title, priority, rooms(room_number)').in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(3) as unknown as Promise<{ data: { id: string; title: string; priority: string; rooms: { room_number: string } | null }[] | null }>,
    supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']).eq('priority', 'high'),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tenants').select('room_id, profiles(full_name)').eq('status', 'active') as unknown as Promise<{ data: { room_id: string; profiles: { full_name: string } | null }[] | null }>,
    supabase.from('meter_readings').select('room_id, meter_type').eq('reading_month', currentMonth).eq('reading_year', currentYear) as unknown as Promise<{ data: { room_id: string; meter_type: string }[] | null }>,
    supabase.from('bills').select('room_id, status, due_date, total_amount').eq('billing_month', currentMonth).eq('billing_year', currentYear) as unknown as Promise<{ data: { room_id: string; status: string; due_date: string | null; total_amount: number }[] | null }>,
    supabase.from('payments').select('amount, paid_at').gte('paid_at', trendStart) as unknown as Promise<{ data: { amount: number; paid_at: string }[] | null }>,
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

  const tenantByRoom = new Map((activeTenants ?? []).map(t => [t.room_id, t]))
  const roomsWithActiveTenant = new Set((activeTenants ?? []).map(t => t.room_id))
  const readingTypesByRoom: Record<string, Set<string>> = {}
  for (const r of readingsThisMonth ?? []) {
    if (!readingTypesByRoom[r.room_id]) readingTypesByRoom[r.room_id] = new Set()
    readingTypesByRoom[r.room_id].add(r.meter_type)
  }
  const missingMeterCount = [...roomsWithActiveTenant].filter(roomId => {
    const types = readingTypesByRoom[roomId]
    return !(types?.has('electric') && types?.has('water'))
  }).length

  // Per-room bill status this month, for the floor plan widget's overdue highlight
  const billByRoom = new Map(
    (billsThisMonth ?? []).map(b => [b.room_id, { ...b, effective: getEffectiveBillStatus({ status: b.status as 'unpaid' | 'paid' | 'overdue', due_date: b.due_date }) }])
  )

  // Group rooms by floor for the floor plan widget (highest floor first, like the reference)
  const roomsByFloor = new Map<number | null, typeof rooms>()
  for (const room of rooms ?? []) {
    const key = room.floor
    if (!roomsByFloor.has(key)) roomsByFloor.set(key, [])
    roomsByFloor.get(key)!.push(room)
  }
  const floorGroups = [...roomsByFloor.entries()].sort((a, b) => (b[0] ?? 0) - (a[0] ?? 0))

  // Last 5 months of revenue, oldest → newest
  const revenueByMonth: { label: string; total: number }[] = []
  for (let i = 4; i >= 0; i--) {
    const d = new Date(currentYear, now.getMonth() - i, 1)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const total = (trendPayments ?? [])
      .filter(p => {
        const paidAt = new Date(p.paid_at)
        return paidAt >= monthStart && paidAt < monthEnd
      })
      .reduce((sum, p) => sum + p.amount, 0)
    revenueByMonth.push({ label: `${MONTH_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`, total })
  }
  const maxRevenue = Math.max(1, ...revenueByMonth.map(m => m.total))

  const priorityLabel: Record<string, string> = { low: 'ทั่วไป', medium: 'ปานกลาง', high: 'เร่งด่วน' }

  const thaiDate = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-[#2563eb] uppercase tracking-widest mb-1">{thaiDate}</p>
          <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">สวัสดีค่ะ 👋</h1>
          <p className="text-sm text-[#71717A] mt-1.5">ภาพรวมระบบจัดการหอพัก Maliving วันนี้</p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/meters/upload"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#eef4ff] border border-black/5 text-[#2563eb] text-sm font-semibold px-4 py-2.5 rounded-lg shadow-[0_1px_2px_rgba(36,25,18,0.04)] transition-all whitespace-nowrap"
          >
            <Camera size={16} />
            อัปโหลดมิเตอร์ (OCR)
          </Link>
          <Link
            href="/admin/bills"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#e3f5ea] border border-black/5 text-[#1e7e46] text-sm font-semibold px-4 py-2.5 rounded-lg shadow-[0_1px_2px_rgba(36,25,18,0.04)] transition-all whitespace-nowrap"
          >
            <FileText size={16} />
            ออกบิลประจำเดือน
          </Link>
          <Link
            href="/admin/rooms/new"
            className="inline-flex items-center justify-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Plus size={16} />
            เพิ่มห้องพัก
          </Link>
        </div>
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
          tone={unpaidCount > 0 ? 'warning' : 'success'}
          label="บิลค้างชำระ"
          value={unpaidCount}
          note={unpaidCount > 0 ? `รวม ฿${unpaidTotal.toLocaleString('th-TH')}` : 'ไม่มีบิลค้าง 🎉'}
        />
        <StatCard
          icon={AlertTriangle}
          tone={overdueCount > 0 ? 'danger' : 'success'}
          label="บิลเกินกำหนด"
          value={overdueCount}
          note={overdueCount > 0 ? `รวม ฿${overdueTotal.toLocaleString('th-TH')}` : 'ไม่มีบิลเกินกำหนด'}
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
          tone="info"
          label="ผู้เช่าทั้งหมด"
          value={tenantCount ?? 0}
          note="Active residents"
        />
        <StatCard
          icon={Wrench}
          tone={(maintenanceCount ?? 0) > 0 ? 'warning' : 'success'}
          label="แจ้งซ่อมรอดำเนินการ"
          value={maintenanceCount ?? 0}
          note={highPriorityCount ? `${highPriorityCount} รายการเร่งด่วน` : 'ไม่มีรายการเร่งด่วน'}
        />
        <StatCard
          icon={Gauge}
          tone={missingMeterCount > 0 ? 'warning' : 'success'}
          label="มิเตอร์ค้างบันทึก"
          value={missingMeterCount}
          note="ห้องที่ยังไม่ได้กรอกมิเตอร์เดือนนี้"
        />
      </div>

      {/* Floor plan + Action items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
        {/* Floor plan status */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] p-5">
          <h2 className="text-sm font-bold text-[#18181B] mb-1">ผังห้องพักและสถานะ</h2>
          <p className="text-xs text-[#71717A] mb-4">{totalRooms} ห้อง · {occupiedRooms} มีผู้เช่า · {totalRooms - occupiedRooms} ว่าง</p>

          <div className="space-y-5">
            {floorGroups.map(([floorNum, floorRooms]) => (
              <div key={floorNum ?? 'none'}>
                <p className="text-xs font-semibold text-[#71717A] mb-2">
                  {floorNum != null ? `ชั้น ${floorNum}` : 'ไม่ระบุชั้น'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {(floorRooms ?? []).map(room => {
                    const tenant = tenantByRoom.get(room.id)
                    const bill = billByRoom.get(room.id)
                    const isOverdue = bill?.effective === 'overdue'
                    const isUnpaid = bill?.status === 'unpaid' && !isOverdue

                    const tone = isOverdue
                      ? 'border-[#fecaca] bg-[#fee2e2]'
                      : room.status === 'available'
                        ? 'border-[#bbf0d1] bg-[#e3f5ea]'
                        : room.status === 'maintenance'
                          ? 'border-[#fecaca] bg-[#fee2e2]'
                          : 'border-black/5 bg-[#FFFAF7]'

                    return (
                      <Link
                        key={room.id}
                        href={`/admin/rooms/${room.id}`}
                        className={`rounded-xl border p-2.5 transition-transform hover:-translate-y-0.5 ${tone}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[#18181B]">ห้อง {room.room_number}</span>
                          {isOverdue && <AlertTriangle size={11} className="text-[#dc2626]" />}
                        </div>
                        {room.status === 'occupied' ? (
                          <>
                            <p className="text-[11px] text-[#3F3F46] truncate">{tenant?.profiles?.full_name ?? '—'}</p>
                            <p className={`text-[10px] mt-0.5 font-medium ${isOverdue ? 'text-[#dc2626]' : isUnpaid ? 'text-[#FF6A00]' : bill ? 'text-[#1e7e46]' : 'text-[#71717A]'}`}>
                              {isOverdue ? `ค้าง ฿${bill!.total_amount.toLocaleString('th-TH')}` : isUnpaid ? 'รอชำระ' : bill ? 'ชำระแล้ว' : 'ยังไม่ออกบิล'}
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-[#71717A]">
                            {room.status === 'maintenance' ? 'ซ่อมบำรุง' : 'ห้องว่าง'}
                          </p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action items */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] p-5">
          <h2 className="text-sm font-bold text-[#18181B] mb-4">สิ่งที่ต้องดำเนินการ</h2>

          <div className="space-y-2.5">
            {missingMeterCount > 0 && (
              <ActionItem
                tone="warning"
                icon={Gauge}
                title={`ยังไม่บันทึกมิเตอร์ ${missingMeterCount} ห้อง`}
                subtitle={`รอบเดือน ${MONTH_SHORT[currentMonth - 1]} ${currentYear}`}
                href="/admin/meters/upload"
                cta="เริ่มจดมิเตอร์"
              />
            )}
            {overdueCount > 0 && (
              <ActionItem
                tone="danger"
                icon={AlertTriangle}
                title={`บิลเกินกำหนด ${overdueCount} รายการ`}
                subtitle={`รวม ฿${overdueTotal.toLocaleString('th-TH')}`}
                href="/admin/bills"
                cta="ดูรายการบิล"
              />
            )}
            {(openMaintenance ?? []).map(m => (
              <ActionItem
                key={m.id}
                tone="brand"
                icon={Wrench}
                title={m.title}
                subtitle={`ห้อง ${m.rooms?.room_number ?? '—'} · ${priorityLabel[m.priority] ?? m.priority}`}
                href="/admin/maintenance"
                cta="ดูรายละเอียด"
              />
            ))}
            {missingMeterCount === 0 && overdueCount === 0 && (openMaintenance ?? []).length === 0 && (
              <p className="text-sm text-[#71717A] text-center py-8">ไม่มีรายการที่ต้องดำเนินการด่วน 🎉</p>
            )}
          </div>
        </div>
      </div>

      {/* Revenue trend */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] p-5 mt-8">
        <h2 className="text-sm font-bold text-[#18181B] mb-1">แนวโน้มรายรับย้อนหลัง 5 เดือน</h2>
        <p className="text-xs text-[#71717A] mb-5">ยอดชำระที่รับแล้วจริง ตามวันที่ชำระ</p>
        <div className="flex items-end justify-between gap-3 h-40">
          {revenueByMonth.map(m => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-[11px] font-semibold text-[#3F3F46]">
                {m.total > 0 ? `฿${(m.total / 1000).toFixed(1)}k` : '—'}
              </span>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-[#FF6A00] to-[#FDBA74] min-h-[4px]"
                style={{ height: `${Math.max(4, (m.total / maxRevenue) * 100)}%` }}
              />
              <span className="text-[11px] text-[#71717A]">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-bold text-[#71717A] uppercase tracking-widest mb-3">{children}</h2>
}

const toneStyles = {
  brand:   { icon: 'bg-[#FFE8D1] text-[#C2410C]', value: 'text-[#18181B]' },
  info:    { icon: 'bg-[#eef4ff] text-[#2563eb]', value: 'text-[#18181B]' },
  success: { icon: 'bg-[#e3f5ea] text-[#1e7e46]', value: 'text-[#18181B]' },
  warning: { icon: 'bg-[#FFE8D1] text-[#FF6A00]', value: 'text-[#FF6A00]' },
  danger:  { icon: 'bg-[#fee2e2] text-[#dc2626]', value: 'text-[#dc2626]' },
} as const

function StatCard({
  icon: Icon,
  tone = 'brand',
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
      <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">{label}</p>
      <p className={`text-[28px] leading-tight font-bold mt-1.5 ${styles.value}`}>
        {typeof value === 'number' ? value.toLocaleString('th-TH') : value}
      </p>
      <p className="text-xs text-[#71717A] mt-1.5 truncate">{note}</p>
    </div>
  )
}

const actionTones = {
  brand:   'bg-[#FFE8D1] text-[#C2410C]',
  warning: 'bg-[#FFE8D1] text-[#FF6A00]',
  danger:  'bg-[#fee2e2] text-[#dc2626]',
} as const

function ActionItem({
  icon: Icon,
  tone,
  title,
  subtitle,
  href,
  cta,
}: {
  icon: LucideIcon
  tone: keyof typeof actionTones
  title: string
  subtitle: string
  href: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-3 rounded-xl border border-black/5 hover:border-[#FF6A00]/30 hover:bg-[#FFFAF7] transition-colors group"
    >
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${actionTones[tone]}`}>
        <Icon size={14} strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#18181B] truncate">{title}</p>
        <p className="text-[11px] text-[#71717A] mt-0.5 truncate">{subtitle}</p>
      </div>
      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#FF6A00] shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {cta} <ArrowRight size={11} />
      </span>
    </Link>
  )
}
