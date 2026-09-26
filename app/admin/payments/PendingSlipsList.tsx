'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, X, ImageOff } from 'lucide-react'

type PendingSlip = {
  id: string
  amount: number
  created_at: string
  bill_id: string
  slip_signed_url: string | null
  tenant_name: string
  room_number: string
  floor: number | null
  billing_month: number
  billing_year: number
}

const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

export default function PendingSlipsList({ slips }: { slips: PendingSlip[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {slips.map(slip => (
        <SlipCard key={slip.id} slip={slip} />
      ))}
    </div>
  )
}

function SlipCard({ slip }: { slip: PendingSlip }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')

  async function review(decision: 'approve' | 'reject') {
    setLoading(decision)
    setError(null)

    const res = await fetch('/api/admin/review-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: slip.id, decision, note: decision === 'reject' ? note : undefined }),
    })
    const body = await res.json()

    if (!res.ok) {
      setError(body.error ?? 'เกิดข้อผิดพลาด')
      setLoading(null)
      return
    }

    router.refresh()
  }

  const createdAt = new Date(slip.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] overflow-hidden flex flex-col">
      {slip.slip_signed_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL, next/image can't optimize an expiring remote URL well
        <img src={slip.slip_signed_url} alt="สลิปการโอนเงิน" className="w-full h-48 object-cover bg-[#F4F4F5]" />
      ) : (
        <div className="w-full h-48 flex items-center justify-center bg-[#F4F4F5] text-[#A1A1AA]">
          <ImageOff size={28} />
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <Link href={`/admin/bills/${slip.bill_id}`} className="text-sm font-bold text-[#18181B] hover:text-[#C2410C] transition-colors">
            {slip.tenant_name} · ห้อง {slip.room_number}
          </Link>
          <p className="text-xs text-[#71717A] mt-0.5">
            {monthNames[slip.billing_month - 1]} {slip.billing_year} · ส่งเมื่อ {createdAt}
          </p>
        </div>

        <p className="text-lg font-bold text-[#FF6A00]">฿{slip.amount.toLocaleString('th-TH')}</p>

        {error && <p className="text-xs text-[#DC2626] bg-[#fee2e2] px-2.5 py-1.5 rounded-lg">{error}</p>}

        {rejecting ? (
          <div className="flex flex-col gap-2 mt-auto">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เหตุผลที่ปฏิเสธ (ถ้ามี)"
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-lg outline-none focus:border-[#FF6A00]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejecting(false)}
                className="flex-1 py-2 rounded-lg border border-[#E4E4E7] text-xs font-semibold text-[#3F3F46] hover:border-[#C2410C] hover:text-[#C2410C] transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => review('reject')}
                disabled={loading !== null}
                className="flex-1 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold transition-colors disabled:opacity-60"
              >
                {loading === 'reject' ? 'กำลังบันทึก…' : 'ยืนยันปฏิเสธ'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => setRejecting(true)}
              disabled={loading !== null}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#fecaca] text-xs font-semibold text-[#DC2626] hover:bg-[#fee2e2] transition-colors disabled:opacity-60"
            >
              <X size={13} />
              ปฏิเสธ
            </button>
            <button
              onClick={() => review('approve')}
              disabled={loading !== null}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1e7e46] hover:bg-[#166534] text-white text-xs font-semibold transition-colors disabled:opacity-60"
            >
              <Check size={13} />
              {loading === 'approve' ? 'กำลังยืนยัน…' : 'ยืนยันชำระ'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
