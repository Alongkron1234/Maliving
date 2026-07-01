'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet } from 'lucide-react'

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#fff8f5] border border-[#ddc1ae] rounded-lg text-sm text-[#241912] ' +
  'outline-none focus:border-[#ff8c00] focus:ring-2 focus:ring-[#ff8c00]/20 transition-all'

const METHODS: { value: 'cash' | 'transfer' | 'qr'; label: string }[] = [
  { value: 'cash', label: 'เงินสด' },
  { value: 'transfer', label: 'โอนเงิน' },
  { value: 'qr', label: 'QR พร้อมเพย์' },
]

export default function RecordPaymentPanel({
  billId,
  totalAmount,
}: {
  billId: string
  totalAmount: number
}) {
  const router = useRouter()
  const [method, setMethod] = useState<'cash' | 'transfer' | 'qr'>('cash')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/admin/record-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill_id: billId, method, paid_at: paidAt }),
    })

    const body = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(body.error ?? 'Something went wrong')
      return
    }

    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)] print:hidden">
      <div className="flex items-center gap-2 mb-1">
        <Wallet size={16} className="text-[#897362]" />
        <h2 className="text-base font-bold text-[#241912]">Record Payment</h2>
      </div>
      <p className="text-sm text-[#897362] mb-6">บันทึกการชำระเงินเต็มจำนวนของบิลนี้</p>

      <div className="grid grid-cols-2 gap-x-5 gap-y-5 mb-6">
        <div>
          <label className="block text-sm font-semibold text-[#241912] mb-2">จำนวนเงิน</label>
          <div className="h-[42px] px-3.5 flex items-center bg-[#f5f5f5] border border-[#ddc1ae] rounded-lg text-sm font-bold text-[#241912]">
            ฿{totalAmount.toLocaleString('th-TH')}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#241912] mb-2">วิธีชำระ</label>
          <select value={method} onChange={e => setMethod(e.target.value as typeof method)} className={inputClass}>
            {METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#241912] mb-2">วันที่ชำระ</label>
          <input
            type="date"
            value={paidAt}
            onChange={e => setPaidAt(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg mb-6">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'กำลังบันทึก…' : 'บันทึกการชำระเงิน'}
      </button>
    </form>
  )
}
