import { createClient } from '@/lib/supabase/server'
import { Wallet, Receipt, TrendingUp, type LucideIcon } from 'lucide-react'
import PaymentsTable from './PaymentsTable'
import PaymentsMonthFilter from './PaymentsMonthFilter'
import PendingSlipsList from './PendingSlipsList'

type PendingSlipRaw = {
  id: string
  amount: number
  slip_url: string | null
  created_at: string
  bill_id: string
  bills: {
    billing_month: number
    billing_year: number
    rooms: { room_number: string; floor: number | null } | null
  } | null
  tenants: {
    profiles: { full_name: string } | null
  } | null
}

type PaymentRaw = {
  id: string
  amount: number
  method: string
  paid_at: string
  bill_id: string
  bills: {
    billing_month: number
    billing_year: number
    rooms: { room_number: string; floor: number | null } | null
  } | null
  tenants: {
    profiles: { full_name: string } | null
  } | null
}

const MONTH_NAMES = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; view?: string }>
}) {
  const { month: monthStr, year: yearStr, view } = await searchParams
  const now = new Date()
  const month = parseInt(monthStr ?? String(now.getMonth() + 1))
  const year = parseInt(yearStr ?? String(now.getFullYear()))
  const showAll = view === 'all'

  const supabase = await createClient()

  let query = supabase
    .from('payments')
    .select('id, amount, method, paid_at, bill_id, bills!inner(billing_month, billing_year, rooms(room_number, floor)), tenants(profiles(full_name))')
    .eq('status', 'confirmed')
    .order('paid_at', { ascending: false })

  if (!showAll) {
    query = query.eq('bills.billing_month', month).eq('bills.billing_year', year)
  }

  const { data: rawPayments } = await query

  const { data: rawPending } = await supabase
    .from('payments')
    .select('id, amount, slip_url, created_at, bill_id, bills!inner(billing_month, billing_year, rooms(room_number, floor)), tenants(profiles(full_name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const pendingSlips = await Promise.all(
    ((rawPending as unknown as PendingSlipRaw[]) ?? []).map(async p => {
      let signedUrl: string | null = null
      if (p.slip_url) {
        const { data } = await supabase.storage.from('payment-slips').createSignedUrl(p.slip_url, 600)
        signedUrl = data?.signedUrl ?? null
      }
      return {
        id: p.id,
        amount: p.amount,
        created_at: p.created_at,
        bill_id: p.bill_id,
        slip_signed_url: signedUrl,
        tenant_name: p.tenants?.profiles?.full_name ?? '—',
        room_number: p.bills?.rooms?.room_number ?? '—',
        floor: p.bills?.rooms?.floor ?? null,
        billing_month: p.bills?.billing_month ?? 1,
        billing_year: p.bills?.billing_year ?? 0,
      }
    })
  )

  const payments = ((rawPayments as unknown as PaymentRaw[]) ?? []).map(p => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    paid_at: p.paid_at,
    bill_id: p.bill_id,
    tenant_name: p.tenants?.profiles?.full_name ?? '—',
    room_number: p.bills?.rooms?.room_number ?? '—',
    floor: p.bills?.rooms?.floor ?? null,
    billing_month: p.bills?.billing_month ?? 1,
    billing_year: p.bills?.billing_year ?? 0,
  }))

  const total = payments.reduce((sum, p) => sum + p.amount, 0)
  const avg = payments.length > 0 ? Math.round(total / payments.length) : 0

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">ประวัติการชำระเงิน</h1>
        <p className="text-sm text-[#71717A] mt-1.5">
          {showAll
            ? `${payments.length} รายการชำระเงินทั้งหมด`
            : `${payments.length} รายการชำระเงินเดือน${MONTH_NAMES[month - 1]} ${year}`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <SummaryPill icon={Wallet} tone="success" label="ยอดรับรวม" value={`฿${total.toLocaleString('th-TH')}`} />
        <SummaryPill icon={Receipt} tone="info" label="จำนวนรายการ" value={payments.length} />
        <SummaryPill icon={TrendingUp} tone="brand" label="เฉลี่ยต่อรายการ" value={`฿${avg.toLocaleString('th-TH')}`} />
      </div>

      {pendingSlips.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[#18181B] mb-1">สลิปรอตรวจสอบ</h2>
          <p className="text-sm text-[#71717A] mb-4">ผู้เช่าแจ้งชำระเงินไว้ {pendingSlips.length} รายการ รอการยืนยัน</p>
          <PendingSlipsList slips={pendingSlips} />
        </div>
      )}

      <div className="mb-6">
        <PaymentsMonthFilter currentMonth={month} currentYear={year} showAll={showAll} />
      </div>

      <PaymentsTable payments={payments} />
    </div>
  )
}

const summaryTones = {
  brand:   'bg-[#FFE8D1] text-[#C2410C]',
  info:    'bg-[#EEF4FF] text-[#2563EB]',
  success: 'bg-[#e3f5ea] text-[#1e7e46]',
} as const

function SummaryPill({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon
  tone: keyof typeof summaryTones
  label: string
  value: number | string
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04)] hover:shadow-[0_4px_16px_rgba(36,25,18,0.08)] transition-shadow">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${summaryTones[tone]}`}>
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-[#18181B] leading-tight truncate">{value}</p>
        <p className="text-[11px] text-[#71717A] truncate">{label}</p>
      </div>
    </div>
  )
}
