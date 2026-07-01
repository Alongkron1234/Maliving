import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { Bill } from '@/lib/types/database'
import { billStatusConfig, getEffectiveBillStatus } from '@/lib/bills'
import PrintReceiptButton from './PrintReceiptButton'

const methodLabels: Record<string, string> = {
  cash: 'เงินสด',
  transfer: 'โอนเงิน',
  qr: 'QR พร้อมเพย์',
}

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function TenantBillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .order('move_in_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const activeTenant = rawTenant as unknown as { id: string } | null

  if (!activeTenant) notFound()

  const { data: rawBill } = await supabase
    .from('bills')
    .select('*, payments(amount, method, paid_at)')
    .eq('id', id)
    .eq('tenant_id', activeTenant.id)
    .single()
  const bill = rawBill as unknown as (Bill & { payments: { amount: number; method: string; paid_at: string }[] }) | null

  if (!bill) notFound()

  const period = `${monthNames[bill.billing_month - 1]} ${bill.billing_year}`
  const dueDate = bill.due_date
    ? new Date(bill.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'
  const createdAt = new Date(bill.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const { label, className } = billStatusConfig[getEffectiveBillStatus(bill)]
  const payment = bill.payments[0]

  return (
    <div className="p-8">
      <Link
        href="/tenant/bills"
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4 print:hidden"
      >
        <ArrowLeft size={15} />
        Back to My Bills
      </Link>

      {/* Print-only receipt header */}
      <div className="hidden print:block mb-6">
        <p className="text-lg font-bold text-[#904d00]">Maliving</p>
        <p className="text-sm text-[#564334]">ใบเสร็จรับเงิน / Receipt</p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-7">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#241912]">{period}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>{label}</span>
        </div>
        <div className="print:hidden">
          <PrintReceiptButton />
        </div>
      </div>

      <div className="max-w-2xl space-y-5">
        <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
          <h2 className="text-base font-bold text-[#241912] mb-1">Bill Information</h2>
          <p className="text-sm text-[#897362] mb-6">Details for this billing period.</p>

          <div className="grid grid-cols-2 gap-x-5 gap-y-5">
            <InfoField label="Billing Period" value={period} />
            <InfoField label="Status" value={label} />
            <InfoField label="Due Date" value={dueDate} />
            <InfoField label="Created At" value={createdAt} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
          <h2 className="text-base font-bold text-[#241912] mb-1">Charges Breakdown</h2>
          <p className="text-sm text-[#897362] mb-6">How the total was calculated.</p>

          <div className="space-y-2.5">
            <Row label="🏠 ค่าเช่า" value={`฿${bill.rent_amount.toLocaleString('th-TH')}`} />
            <Row label="⚡ ค่าไฟ" value={`฿${bill.electric_amount.toLocaleString('th-TH')}`} />
            <Row label="💧 ค่าน้ำ" value={`฿${bill.water_amount.toLocaleString('th-TH')}`} />
            <div className="flex items-center justify-between pt-3 border-t border-[#ddc1ae]">
              <span className="text-sm font-bold text-[#241912]">รวมทั้งหมด</span>
              <span className="text-lg font-bold text-[#ff8c00]">฿{bill.total_amount.toLocaleString('th-TH')}</span>
            </div>
          </div>
        </div>

        {payment && (
          <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
            <h2 className="text-base font-bold text-[#241912] mb-1">Payment Information</h2>
            <p className="text-sm text-[#897362] mb-6">บิลนี้ชำระเรียบร้อยแล้ว</p>

            <div className="grid grid-cols-2 gap-x-5 gap-y-5">
              <InfoField label="วิธีชำระ" value={methodLabels[payment.method] ?? payment.method} />
              <InfoField
                label="วันที่ชำระ"
                value={new Date(payment.paid_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#897362] uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm font-semibold text-[#241912]">{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-[#564334]">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
