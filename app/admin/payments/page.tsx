import { createClient } from '@/lib/supabase/server'
import PaymentsTable from './PaymentsTable'
import PaymentsMonthFilter from './PaymentsMonthFilter'

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

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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
    .order('paid_at', { ascending: false })

  if (!showAll) {
    query = query.eq('bills.billing_month', month).eq('bills.billing_year', year)
  }

  const { data: rawPayments } = await query

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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#241912]">Payments</h1>
        <p className="text-sm text-[#897362] mt-1">
          {showAll
            ? `${payments.length} รายการชำระเงินทั้งหมด`
            : `${payments.length} รายการชำระเงินเดือน ${MONTH_NAMES[month - 1]} ${year}`}
        </p>
      </div>

      <div className="mb-6">
        <PaymentsMonthFilter currentMonth={month} currentYear={year} showAll={showAll} />
      </div>

      <PaymentsTable payments={payments} />
    </div>
  )
}
