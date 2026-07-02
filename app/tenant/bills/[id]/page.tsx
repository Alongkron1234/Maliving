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

const monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
}

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
    .select('*, rooms(id, room_number, floor), payments(amount, method, paid_at)')
    .eq('id', id)
    .eq('tenant_id', activeTenant.id)
    .single()
  type BillWithExtras = Bill & {
    rooms: { id: string; room_number: string; floor: number | null } | null
    payments: { amount: number; method: string; paid_at: string }[]
  }
  const bill = rawBill as unknown as BillWithExtras | null

  if (!bill) notFound()

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user!.id)
    .single()
  const profile = rawProfile as unknown as { full_name: string; phone: string | null } | null

  const room = bill.rooms
  const { data: rawReadings } = room
    ? await supabase
        .from('meter_readings')
        .select('meter_type, units_used')
        .eq('room_id', room.id)
        .eq('reading_month', bill.billing_month)
        .eq('reading_year', bill.billing_year)
    : { data: null }
  type ReadingRow = { meter_type: 'electric' | 'water'; units_used: number }
  const readings = (rawReadings ?? []) as ReadingRow[]
  const electricUnits = readings.find(r => r.meter_type === 'electric')?.units_used
  const waterUnits = readings.find(r => r.meter_type === 'water')?.units_used

  const period = `${monthNames[bill.billing_month - 1]} ${bill.billing_year}`
  const dueDate = bill.due_date ? formatThaiDate(bill.due_date) : '—'
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

      {/* Print-only receipt — a single self-contained layout, independent of the on-screen cards below */}
      <div className="hidden print:block mb-6">
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-[#241912]">
          <div>
            <p className="text-xl font-bold text-[#904d00]">Maliving</p>
            <p className="text-sm text-[#564334]">ใบแจ้งค่าห้องที่ต้องชำระ</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>{label}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 text-sm">
          <div>
            <p className="text-[#897362]">ห้อง</p>
            <p className="font-semibold text-[#241912]">{room?.room_number ?? '—'}{room?.floor != null ? ` (ชั้น ${room.floor})` : ''}</p>
          </div>
          <div>
            <p className="text-[#897362]">งวดบิล</p>
            <p className="font-semibold text-[#241912]">{period}</p>
          </div>
          <div>
            <p className="text-[#897362]">ผู้เช่า</p>
            <p className="font-semibold text-[#241912]">{profile?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[#897362]">เบอร์โทร</p>
            <p className="font-semibold text-[#241912]">{profile?.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-[#897362]">ครบกำหนดชำระ</p>
            <p className="font-semibold text-[#241912]">{dueDate}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-[#241912]">
              <th className="text-left py-2 font-semibold text-[#241912]">รายการ</th>
              <th className="text-right py-2 font-semibold text-[#241912]">จำนวนหน่วย</th>
              <th className="text-right py-2 font-semibold text-[#241912]">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#ddc1ae]">
              <td className="py-2.5 text-[#564334]">🏠 ค่าเช่า</td>
              <td className="py-2.5 text-right text-[#897362]">—</td>
              <td className="py-2.5 text-right font-semibold text-[#241912]">฿{bill.rent_amount.toLocaleString('th-TH')}</td>
            </tr>
            <tr className="border-b border-[#ddc1ae]">
              <td className="py-2.5 text-[#564334]">⚡ ค่าไฟฟ้า</td>
              <td className="py-2.5 text-right text-[#897362]">{electricUnits != null ? `${electricUnits} หน่วย` : '—'}</td>
              <td className="py-2.5 text-right font-semibold text-[#241912]">฿{bill.electric_amount.toLocaleString('th-TH')}</td>
            </tr>
            <tr className="border-b border-[#ddc1ae]">
              <td className="py-2.5 text-[#564334]">💧 ค่าน้ำประปา</td>
              <td className="py-2.5 text-right text-[#897362]">{waterUnits != null ? `${waterUnits} หน่วย` : '—'}</td>
              <td className="py-2.5 text-right font-semibold text-[#241912]">฿{bill.water_amount.toLocaleString('th-TH')}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#241912]">
              <td colSpan={2} className="py-3 font-bold text-[#241912]">รวมทั้งหมด</td>
              <td className="py-3 text-right text-lg font-bold text-[#ff8c00]">฿{bill.total_amount.toLocaleString('th-TH')}</td>
            </tr>
          </tfoot>
        </table>

        <p className="text-xs text-[#c9a990]">
          พิมพ์เมื่อ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="print:hidden flex items-center justify-between gap-3 mb-7 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-[#241912]">{period}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>{label}</span>
        </div>
        <div className="print:hidden">
          <PrintReceiptButton />
        </div>
      </div>

      <div className="print:hidden max-w-2xl space-y-5">
        <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
          <h2 className="text-base font-bold text-[#241912] mb-1">Bill Information</h2>
          <p className="text-sm text-[#897362] mb-6">Details for this billing period.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
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
