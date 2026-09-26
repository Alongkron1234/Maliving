import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, FileText } from 'lucide-react'
import type { Bill } from '@/lib/types/database'
import { billStatusConfig, getEffectiveBillStatus } from '@/lib/bills'

const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function formatDueDate(due_date: string | null) {
  return due_date
    ? new Date(due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'
}

export default async function TenantBillsPage() {
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

  if (!activeTenant) {
    return (
      <div className="p-6 sm:p-8">
        <div className="rounded-2xl border-2 border-dashed border-[#E4E4E7] p-16 text-center">
          <p className="text-sm font-semibold text-[#3F3F46]">คุณยังไม่ได้รับมอบหมายห้องพัก</p>
          <p className="text-sm text-[#71717A] mt-1">กรุณาติดต่อผู้ดูแลหอพัก</p>
        </div>
      </div>
    )
  }

  const [{ data: rawBills }, { data: rawLastPayment }] = await Promise.all([
    supabase
      .from('bills')
      .select('*')
      .eq('tenant_id', activeTenant.id)
      .order('billing_year', { ascending: false })
      .order('billing_month', { ascending: false }),
    supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('tenant_id', activeTenant.id)
      .eq('status', 'confirmed')
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const bills = (rawBills as unknown as Bill[]) ?? []
  const lastPayment = rawLastPayment as unknown as { amount: number; paid_at: string } | null

  const totalOutstanding = bills
    .filter(b => b.status !== 'paid')
    .reduce((sum, b) => sum + b.total_amount, 0)

  const [latestBill, ...olderBills] = bills

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#18181B]">บิลของฉัน</h1>
          <p className="text-sm text-[#71717A] mt-1">คุณมีรายการบิลทั้งหมด {bills.length} รายการ</p>
        </div>

        {bills.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl border border-black/5 px-5 py-3 text-right">
              <p className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wide">ยอดค้างชำระ</p>
              <p className="text-lg font-bold text-[#FF6A00] mt-0.5">฿{totalOutstanding.toLocaleString('th-TH')}</p>
            </div>
            <div className="bg-white rounded-xl border border-black/5 px-5 py-3 text-right">
              <p className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wide">ชำระล่าสุด</p>
              <p className="text-lg font-bold text-[#18181B] mt-0.5">
                {lastPayment ? `฿${lastPayment.amount.toLocaleString('th-TH')}` : '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      {bills.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E4E4E7] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#FFE8D1] flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-[#71717A]" />
          </div>
          <p className="text-sm font-semibold text-[#3F3F46]">ยังไม่มีบิล</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Latest bill — expanded card */}
          <Link
            href={`/tenant/bills/${latestBill.id}`}
            className="block bg-white rounded-2xl border border-black/5 p-6 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] hover:shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#FFE8D1] flex items-center justify-center shrink-0">
                  <Calendar size={20} className="text-[#C2410C]" />
                </div>
                <div>
                  <p className="text-base font-bold text-[#18181B]">
                    {monthNames[latestBill.billing_month - 1]} {latestBill.billing_year}
                  </p>
                  <p className="text-xs text-[#71717A] mt-0.5">ครบกำหนด {formatDueDate(latestBill.due_date)}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-[#18181B]">฿{latestBill.total_amount.toLocaleString('th-TH')}</p>
                <span className={`inline-block mt-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${billStatusConfig[getEffectiveBillStatus(latestBill)].className}`}>
                  {billStatusConfig[getEffectiveBillStatus(latestBill)].label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#F4F4F5]">
              <BreakdownItem label="ค่าเช่า" value={latestBill.rent_amount} />
              <BreakdownItem label="ค่าไฟ" value={latestBill.electric_amount} />
              <BreakdownItem label="ค่าน้ำ" value={latestBill.water_amount} />
            </div>
          </Link>

          {/* Older bills — compact grid */}
          {olderBills.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {olderBills.map(bill => {
                const { label, className } = billStatusConfig[getEffectiveBillStatus(bill)]
                return (
                  <div
                    key={bill.id}
                    className="bg-white rounded-2xl border border-black/5 p-5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#FFE8D1] flex items-center justify-center shrink-0">
                          <FileText size={15} className="text-[#C2410C]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#18181B]">
                            {monthNames[bill.billing_month - 1]} {bill.billing_year}
                          </p>
                          <p className="text-xs text-[#71717A] mt-0.5">ครบกำหนด {formatDueDate(bill.due_date)}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${className}`}>
                        {label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <p className="text-base font-bold text-[#18181B]">฿{bill.total_amount.toLocaleString('th-TH')}</p>
                      <Link
                        href={`/tenant/bills/${bill.id}`}
                        className="text-xs font-semibold text-[#FF6A00] hover:text-[#C2410C] transition-colors"
                      >
                        ดูใบเสร็จ →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BreakdownItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-[#18181B] mt-0.5">฿{value.toLocaleString('th-TH')}</p>
    </div>
  )
}
