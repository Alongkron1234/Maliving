import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Home, User } from 'lucide-react'
import type { BillStatus } from '@/lib/types/database'
import { billStatusConfig, getEffectiveBillStatus } from '@/lib/bills'
import DeleteBillButton from './DeleteBillButton'
import RecordPaymentPanel from './RecordPaymentPanel'
import PaymentInfoCard from './PaymentInfoCard'
import PrintReceiptButton from './PrintReceiptButton'

type BillDetail = {
  id: string
  billing_month: number
  billing_year: number
  rent_amount: number
  electric_amount: number
  water_amount: number
  total_amount: number
  status: BillStatus
  due_date: string | null
  created_at: string
  rooms: { id: string; room_number: string; floor: number | null } | null
  tenants: {
    id: string
    move_in_date: string
    profiles: { id: string; full_name: string; phone: string | null } | null
  } | null
  payments: { id: string; amount: number; method: string; paid_at: string }[]
}

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawBill } = await supabase
    .from('bills')
    .select('*, rooms(id, room_number, floor), tenants(id, move_in_date, profiles(id, full_name, phone)), payments(id, amount, method, paid_at)')
    .eq('id', id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bill: BillDetail | null = rawBill as any

  if (!bill) notFound()

  const room = bill.rooms
  const tenant = bill.tenants
  const profile = tenant?.profiles

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
  const dueDate = bill.due_date
    ? new Date(bill.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'
  const createdAt = new Date(bill.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const { label, className } = billStatusConfig[getEffectiveBillStatus(bill)]
  const payment = bill.payments[0]

  return (
    <div className="p-8">
      <Link
        href="/admin/bills"
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4 print:hidden"
      >
        <ArrowLeft size={15} />
        Back to Bills
      </Link>

      {/* Print-only receipt — a single self-contained layout, independent of the on-screen cards below */}
      <div className="hidden print:block mb-6">
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-[#241912]">
          <div>
            <p className="text-xl font-bold text-[#904d00]">Maliving</p>
            <p className="text-sm text-[#564334]">ใบเสร็จรับเงิน / Receipt</p>
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

      {/* Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-7">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#241912]">
              Room {room?.room_number ?? '—'} · {period}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
              {label}
            </span>
          </div>
          <p className="text-sm text-[#897362] mt-0.5">
            ฿{bill.total_amount.toLocaleString('th-TH')} รวมทั้งหมด
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3 print:hidden">
          {tenant && (
            <Link
              href={`/admin/tenants/${tenant.id}`}
              className="inline-flex items-center gap-2 border border-[#ddc1ae] text-[#564334] text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-[#904d00] hover:text-[#904d00] transition-colors"
            >
              <User size={15} />
              {profile?.full_name ?? 'Tenant'}
            </Link>
          )}
          {room && (
            <Link
              href={`/admin/rooms/${room.id}`}
              className="inline-flex items-center gap-2 border border-[#ddc1ae] text-[#564334] text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-[#904d00] hover:text-[#904d00] transition-colors"
            >
              <Home size={15} />
              Room {room.room_number}
            </Link>
          )}
          <PrintReceiptButton />
          <DeleteBillButton billId={bill.id} />
        </div>
      </div>

      <div className="print:hidden max-w-2xl space-y-5">
        {/* Bill Information */}
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

        {/* Tenant & Room */}
        <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
          <h2 className="text-base font-bold text-[#241912] mb-1">Tenant &amp; Room</h2>
          <p className="text-sm text-[#897362] mb-6">Who and where this bill applies to.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InfoField label="Tenant" value={profile?.full_name ?? '—'} />
            <InfoField label="Phone" value={profile?.phone ?? 'No phone'} />
            <InfoField
              label="Room"
              value={room ? `Room ${room.room_number}${room.floor != null ? ` · Floor ${room.floor}` : ''}` : '—'}
            />
          </div>
        </div>

        {/* Charges Breakdown */}
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

        {/* Payment: form when unpaid, recorded info when paid — keyed off raw status,
            not the effective (overdue) one, since an overdue bill is still payable */}
        {bill.status === 'paid' && payment ? (
          <PaymentInfoCard billId={bill.id} amount={payment.amount} method={payment.method} paidAt={payment.paid_at} />
        ) : bill.status === 'unpaid' ? (
          <RecordPaymentPanel billId={bill.id} totalAmount={bill.total_amount} />
        ) : null}
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