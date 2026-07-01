'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Undo2 } from 'lucide-react'

const methodLabels: Record<string, string> = {
  cash: 'เงินสด',
  transfer: 'โอนเงิน',
  qr: 'QR พร้อมเพย์',
}

export default function PaymentInfoCard({
  billId,
  amount,
  method,
  paidAt,
}: {
  billId: string
  amount: number
  method: string
  paidAt: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleUndo() {
    if (!window.confirm('ยกเลิกการชำระเงินนี้? บิลจะกลับไปเป็นสถานะ Unpaid')) return

    setLoading(true)
    await fetch(`/api/admin/record-payment?bill_id=${billId}`, { method: 'DELETE' })
    router.refresh()
  }

  const paidAtLabel = new Date(paidAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 size={16} className="text-[#16a34a]" />
        <h2 className="text-base font-bold text-[#241912]">Payment Information</h2>
      </div>
      <p className="text-sm text-[#897362] mb-6">บิลนี้ชำระเรียบร้อยแล้ว</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5 mb-6">
        <InfoField label="จำนวนเงิน" value={`฿${amount.toLocaleString('th-TH')}`} />
        <InfoField label="วิธีชำระ" value={methodLabels[method] ?? method} />
        <InfoField label="วันที่ชำระ" value={paidAtLabel} />
      </div>

      <button
        onClick={handleUndo}
        disabled={loading}
        className="print:hidden inline-flex items-center gap-2 border border-[#ffdad6] text-[#93000a] text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#ffdad6] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Undo2 size={15} />
        {loading ? 'กำลังยกเลิก…' : 'Undo Payment'}
      </button>
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
