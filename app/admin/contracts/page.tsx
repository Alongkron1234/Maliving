import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileSignature, CalendarClock, AlertTriangle, ChevronRight, type LucideIcon } from 'lucide-react'
import type { Contract } from '@/lib/types/database'
import { contractStatusConfig, getEffectiveContractStatus, daysUntil, type EffectiveContractStatus } from '@/lib/contracts'

type ContractRow = Contract & {
  tenants: { profiles: { full_name: string } | null } | null
  rooms: { room_number: string; floor: number | null } | null
}

const FILTERS: { key: string; label: string; match: (s: EffectiveContractStatus) => boolean }[] = [
  { key: 'all', label: 'ทั้งหมด', match: () => true },
  { key: 'active', label: 'มีผลอยู่', match: s => s === 'active' || s === 'expiring_soon' },
  { key: 'expiring', label: 'ใกล้หมดสัญญา', match: s => s === 'expiring_soon' },
  { key: 'expired', label: 'หมดสัญญาแล้ว', match: s => s === 'expired' },
  { key: 'history', label: 'ประวัติ', match: s => s === 'renewed' || s === 'terminated' },
]

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = 'all' } = await searchParams
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('contracts')
    .select('*, tenants(profiles(full_name)), rooms(room_number, floor)')
    .order('end_date', { ascending: true })

  // Work out expiring/expired here, from end_date, instead of reading it from the database
  const contracts = ((raw as unknown as ContractRow[]) ?? []).map(c => ({
    ...c,
    effective: getEffectiveContractStatus(c),
  }))

  const liveCount = contracts.filter(c => c.effective === 'active' || c.effective === 'expiring_soon').length
  const expiringCount = contracts.filter(c => c.effective === 'expiring_soon').length
  const expiredCount = contracts.filter(c => c.effective === 'expired').length

  const current = FILTERS.find(f => f.key === filter) ?? FILTERS[0]
  const visible = contracts.filter(c => current.match(c.effective))

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">สัญญาเช่า</h1>
          <p className="text-sm text-[#71717A] mt-1.5">ติดตามอายุสัญญา ต่อสัญญา และยกเลิกสัญญาของผู้เช่า</p>
        </div>
        <Link
          href="/admin/contracts/new"
          className="inline-flex items-center justify-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
        >
          <Plus size={16} />
          สร้างสัญญา
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <SummaryPill icon={FileSignature} tone="success" label="สัญญาที่มีผลอยู่" value={liveCount} />
        <SummaryPill icon={CalendarClock} tone="warn" label="ใกล้หมดสัญญา (30 วัน)" value={expiringCount} />
        <SummaryPill icon={AlertTriangle} tone="danger" label="หมดสัญญาแล้ว (ยังไม่จัดการ)" value={expiredCount} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        {FILTERS.map(f => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/admin/contracts' : `/admin/contracts?filter=${f.key}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              current.key === f.key
                ? 'bg-[#FF6A00] text-white shadow-sm shadow-[#FF6A00]/30'
                : 'bg-white border border-[#E4E4E7] text-[#3F3F46] hover:border-[#FF6A00] hover:text-[#C2410C]'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E4E4E7] p-14 text-center">
          <p className="text-sm font-semibold text-[#3F3F46]">ไม่มีสัญญาในหมวดนี้</p>
          <p className="text-sm text-[#71717A] mt-1">กด &quot;สร้างสัญญา&quot; เพื่อเพิ่มสัญญาของผู้เช่า</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(c => {
            const cfg = contractStatusConfig[c.effective]
            const days = daysUntil(c.end_date)
            return (
              <Link
                key={c.id}
                href={`/admin/contracts/${c.id}`}
                className="group flex items-center gap-4 bg-white rounded-2xl border border-black/5 p-5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] hover:shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] hover:-translate-y-0.5 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-[#18181B] truncate">
                    {c.tenants?.profiles?.full_name ?? '—'}
                    <span className="font-medium text-[#71717A]"> · ห้อง {c.rooms?.room_number ?? '—'}</span>
                  </p>
                  <p className="text-sm text-[#71717A] mt-1">
                    {formatDate(c.start_date)} – {formatDate(c.end_date)}
                    {(c.effective === 'active' || c.effective === 'expiring_soon') && days >= 0 && (
                      <span className="text-[#A1A1AA]"> · เหลือ {days} วัน</span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm font-bold text-[#18181B]">฿{c.rent_amount.toLocaleString('th-TH')}/เดือน</p>
                  <p className="text-xs text-[#71717A]">มัดจำ ฿{c.deposit_amount.toLocaleString('th-TH')}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${cfg.className}`}>{cfg.label}</span>
                <ChevronRight size={18} className="text-[#A1A1AA] group-hover:text-[#C2410C] shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

const summaryTones = {
  success: 'bg-[#e3f5ea] text-[#1e7e46]',
  warn: 'bg-[#FEF3C7] text-[#B45309]',
  danger: 'bg-[#fee2e2] text-[#dc2626]',
} as const

function SummaryPill({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: keyof typeof summaryTones; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04)]">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${summaryTones[tone]}`}>
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-[#18181B] leading-tight">{value}</p>
        <p className="text-[11px] text-[#71717A] truncate">{label}</p>
      </div>
    </div>
  )
}
