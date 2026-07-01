import { createClient } from '@/lib/supabase/server'
import PaymentsTable from './PaymentsTable'

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

export default async function PaymentsPage() {
  const supabase = await createClient()

  const { data: rawPayments } = await supabase
    .from('payments')
    .select('id, amount, method, paid_at, bill_id, bills(billing_month, billing_year, rooms(room_number, floor)), tenants(profiles(full_name))')
    .order('paid_at', { ascending: false })

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
          {payments.length} รายการชำระเงินทั้งหมด
        </p>
      </div>

      <PaymentsTable payments={payments} />
    </div>
  )
}
