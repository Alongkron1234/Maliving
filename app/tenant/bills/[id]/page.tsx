import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { Bill } from '@/lib/types/database'
import { billStatusConfig, getEffectiveBillStatus } from '@/lib/bills'
import { generatePromptPayQr } from '@/lib/promptpay'
import PrintReceiptButton from './PrintReceiptButton'
import SlipUploadForm from './SlipUploadForm'

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
    .select('*, rooms(id, room_number, floor), payments(id, amount, method, paid_at, status, note, created_at)')
    .eq('id', id)
    .eq('tenant_id', activeTenant.id)
    .single()
  type PaymentRow = {
    id: string
    amount: number
    method: string
    paid_at: string
    status: 'pending' | 'confirmed' | 'rejected'
    note: string | null
    created_at: string
  }
  type BillWithExtras = Bill & {
    rooms: { id: string; room_number: string; floor: number | null } | null
    payments: PaymentRow[]
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
  const createdAt = formatThaiDate(bill.created_at)
  const { label, className } = billStatusConfig[getEffectiveBillStatus(bill)]
  const paymentsByNewest = [...bill.payments].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const confirmedPayment = paymentsByNewest.find(p => p.status === 'confirmed')
  const pendingPayment = paymentsByNewest.find(p => p.status === 'pending')
  const latestRejected = paymentsByNewest.find(p => p.status === 'rejected')

  const qrDataUrl = bill.status === 'unpaid' && !pendingPayment
    ? await generatePromptPayQr(bill.total_amount)
    : null

  return (
    <div className="p-6 sm:p-8">
      <Link
        href="/tenant/bills"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] transition-colors mb-4 print:hidden"
      >
        <ArrowLeft size={15} />
        กลับไปหน้าบิลของฉัน
      </Link>

      {/* Print-only receipt — a single self-contained layout, independent of the on-screen cards below */}
      <div className="hidden print:block mb-6">
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-[#18181B]">
          <div>
            <p className="text-xl font-bold text-[#C2410C]">Maliving</p>
            <p className="text-sm text-[#3F3F46]">ใบแจ้งค่าห้องที่ต้องชำระ</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>{label}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 text-sm">
          <div>
            <p className="text-[#71717A]">ห้อง</p>
            <p className="font-semibold text-[#18181B]">{room?.room_number ?? '—'}{room?.floor != null ? ` (ชั้น ${room.floor})` : ''}</p>
          </div>
          <div>
            <p className="text-[#71717A]">งวดบิล</p>
            <p className="font-semibold text-[#18181B]">{period}</p>
          </div>
          <div>
            <p className="text-[#71717A]">ผู้เช่า</p>
            <p className="font-semibold text-[#18181B]">{profile?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[#71717A]">เบอร์โทร</p>
            <p className="font-semibold text-[#18181B]">{profile?.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-[#71717A]">ครบกำหนดชำระ</p>
            <p className="font-semibold text-[#18181B]">{dueDate}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-[#18181B]">
              <th className="text-left py-2 font-semibold text-[#18181B]">รายการ</th>
              <th className="text-right py-2 font-semibold text-[#18181B]">จำนวนหน่วย</th>
              <th className="text-right py-2 font-semibold text-[#18181B]">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#E4E4E7]">
              <td className="py-2.5 text-[#3F3F46]">🏠 ค่าเช่า</td>
              <td className="py-2.5 text-right text-[#71717A]">—</td>
              <td className="py-2.5 text-right font-semibold text-[#18181B]">฿{bill.rent_amount.toLocaleString('th-TH')}</td>
            </tr>
            <tr className="border-b border-[#E4E4E7]">
              <td className="py-2.5 text-[#3F3F46]">⚡ ค่าไฟฟ้า</td>
              <td className="py-2.5 text-right text-[#71717A]">{electricUnits != null ? `${electricUnits} หน่วย` : '—'}</td>
              <td className="py-2.5 text-right font-semibold text-[#18181B]">฿{bill.electric_amount.toLocaleString('th-TH')}</td>
            </tr>
            <tr className="border-b border-[#E4E4E7]">
              <td className="py-2.5 text-[#3F3F46]">💧 ค่าน้ำประปา</td>
              <td className="py-2.5 text-right text-[#71717A]">{waterUnits != null ? `${waterUnits} หน่วย` : '—'}</td>
              <td className="py-2.5 text-right font-semibold text-[#18181B]">฿{bill.water_amount.toLocaleString('th-TH')}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#18181B]">
              <td colSpan={2} className="py-3 font-bold text-[#18181B]">รวมทั้งหมด</td>
              <td className="py-3 text-right text-lg font-bold text-[#FF6A00]">฿{bill.total_amount.toLocaleString('th-TH')}</td>
            </tr>
          </tfoot>
        </table>

        <p className="text-xs text-[#A1A1AA]">
          พิมพ์เมื่อ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="print:hidden flex items-center justify-between gap-3 mb-7 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-[#18181B]">{period}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>{label}</span>
        </div>
        <div className="print:hidden">
          <PrintReceiptButton />
        </div>
      </div>

      <div className="print:hidden max-w-2xl space-y-5">
        <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
          <h2 className="text-base font-bold text-[#18181B] mb-1">ข้อมูลบิล</h2>
          <p className="text-sm text-[#71717A] mb-6">รายละเอียดของบิลงวดนี้</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InfoField label="งวดบิล" value={period} />
            <InfoField label="สถานะ" value={label} />
            <InfoField label="ครบกำหนดชำระ" value={dueDate} />
            <InfoField label="วันที่ออกบิล" value={createdAt} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
          <h2 className="text-base font-bold text-[#18181B] mb-1">รายละเอียดค่าใช้จ่าย</h2>
          <p className="text-sm text-[#71717A] mb-6">วิธีคำนวณยอดรวม</p>

          <div className="space-y-2.5">
            <Row label="🏠 ค่าเช่า" value={`฿${bill.rent_amount.toLocaleString('th-TH')}`} />
            <Row label="⚡ ค่าไฟ" value={`฿${bill.electric_amount.toLocaleString('th-TH')}`} />
            <Row label="💧 ค่าน้ำ" value={`฿${bill.water_amount.toLocaleString('th-TH')}`} />
            <div className="flex items-center justify-between pt-3 border-t border-[#E4E4E7]">
              <span className="text-sm font-bold text-[#18181B]">รวมทั้งหมด</span>
              <span className="text-lg font-bold text-[#FF6A00]">฿{bill.total_amount.toLocaleString('th-TH')}</span>
            </div>
          </div>
        </div>

        {confirmedPayment && (
          <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
            <h2 className="text-base font-bold text-[#18181B] mb-1">ข้อมูลการชำระเงิน</h2>
            <p className="text-sm text-[#71717A] mb-6">บิลนี้ชำระเรียบร้อยแล้ว</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
              <InfoField label="วิธีชำระ" value={methodLabels[confirmedPayment.method] ?? confirmedPayment.method} />
              <InfoField label="วันที่ชำระ" value={formatThaiDate(confirmedPayment.paid_at)} />
            </div>
          </div>
        )}

        {bill.status === 'unpaid' && (
          <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
            <h2 className="text-base font-bold text-[#18181B] mb-1">ชำระเงินผ่าน PromptPay</h2>
            <p className="text-sm text-[#71717A] mb-6">สแกน QR เพื่อโอนเงิน แล้วแนบสลิปเพื่อแจ้งชำระ</p>

            {pendingPayment ? (
              <div className="rounded-xl bg-[#FEF3C7] border border-[#FDE68A] p-5">
                <p className="text-sm font-semibold text-[#B45309]">ส่งสลิปแล้ว รอผู้ดูแลตรวจสอบ</p>
                <p className="text-xs text-[#B45309]/80 mt-1">
                  ส่งเมื่อ {formatThaiDate(pendingPayment.created_at)} — เมื่อผู้ดูแลยืนยันแล้ว บิลนี้จะเปลี่ยนเป็น &quot;ชำระแล้ว&quot; อัตโนมัติ
                </p>
              </div>
            ) : (
              <>
                {latestRejected && (
                  <div className="rounded-xl bg-[#fee2e2] border border-[#fecaca] p-4 mb-5">
                    <p className="text-sm font-semibold text-[#dc2626]">สลิปก่อนหน้าถูกปฏิเสธ</p>
                    {latestRejected.note && (
                      <p className="text-xs text-[#dc2626]/80 mt-1">เหตุผล: {latestRejected.note}</p>
                    )}
                    <p className="text-xs text-[#dc2626]/80 mt-1">กรุณาตรวจสอบยอดโอนแล้วอัปโหลดสลิปใหม่อีกครั้ง</p>
                  </div>
                )}

                {qrDataUrl ? (
                  <div className="flex flex-col items-center mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image can't optimize it */}
                    <img src={qrDataUrl} alt="PromptPay QR" className="w-52 h-52 rounded-xl border border-[#E4E4E7]" />
                    <p className="text-sm text-[#71717A] mt-3">ยอดที่ต้องชำระ</p>
                    <p className="text-2xl font-bold text-[#FF6A00]">฿{bill.total_amount.toLocaleString('th-TH')}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#E4E4E7] p-5 text-center mb-6">
                    <p className="text-sm text-[#71717A]">ยอดที่ต้องชำระ</p>
                    <p className="text-xl font-bold text-[#18181B] mt-1">฿{bill.total_amount.toLocaleString('th-TH')}</p>
                    <p className="text-xs text-[#A1A1AA] mt-2">ผู้ดูแลยังไม่ได้ตั้งค่า PromptPay QR — โอนเงินตามช่องทางปกติแล้วแนบสลิปด้านล่าง</p>
                  </div>
                )}

                <SlipUploadForm billId={bill.id} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm font-semibold text-[#18181B]">{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-[#3F3F46]">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
