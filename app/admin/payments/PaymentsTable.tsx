'use client'

import { useRouter } from 'next/navigation'

type PaymentRow = {
  id: string
  amount: number
  method: string
  paid_at: string
  bill_id: string
  tenant_name: string
  room_number: string
  floor: number | null
  billing_month: number
  billing_year: number
}

const methodConfig: Record<string, { label: string; className: string }> = {
  cash: { label: 'เงินสด', className: 'bg-[#FFE8D1] text-[#71717A]' },
  transfer: { label: 'โอนเงิน', className: 'bg-[#EEF4FF] text-[#2563EB]' },
  qr: { label: 'QR', className: 'bg-[#f0fdf4] text-[#16a34a]' },
}

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  const router = useRouter()

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-12 shadow-[0_0_15px_rgba(144,77,0,0.06)] text-center">
        <p className="text-sm text-[#71717A]">ยังไม่มีรายการชำระเงิน</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E4E4E7] shadow-[0_0_15px_rgba(144,77,0,0.06)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-[#FFFAF7] border-b border-[#E4E4E7]">
              <th className="text-left px-5 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">ผู้เช่า</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">ห้อง</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">งวดบิล</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">จำนวนเงิน</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">วิธีชำระ</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">วันที่ชำระ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F4F5]">
            {payments.map(p => {
              const method = methodConfig[p.method] ?? { label: p.method, className: 'bg-[#F4F4F5] text-[#71717A]' }
              const paidAt = new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/admin/bills/${p.bill_id}`)}
                  className="cursor-pointer hover:bg-[#FFFAF7] transition-colors"
                >
                  <td className="px-5 py-3.5 font-semibold text-[#18181B]">{p.tenant_name}</td>
                  <td className="px-4 py-3.5 text-[#3F3F46]">
                    Room {p.room_number}{p.floor != null ? ` (F${p.floor})` : ''}
                  </td>
                  <td className="px-4 py-3.5 text-[#3F3F46]">
                    {monthNames[p.billing_month - 1]} {p.billing_year}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-bold text-[#18181B]">
                    ฿{p.amount.toLocaleString('th-TH')}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${method.className}`}>
                      {method.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#71717A]">{paidAt}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
