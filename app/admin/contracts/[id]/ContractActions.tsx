'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, XCircle } from 'lucide-react'
import { addMonths } from '@/lib/contracts'

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#FFFAF7] border border-[#E4E4E7] rounded-lg text-sm text-[#18181B] ' +
  'outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all'

export default function ContractActions({
  contractId,
  endDate,
  rentAmount,
  tenantName,
}: {
  contractId: string
  endDate: string
  rentAmount: number
  tenantName: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'none' | 'renew' | 'terminate'>('none')
  const [newEnd, setNewEnd] = useState(addMonths(endDate, 12))
  const [newRent, setNewRent] = useState(String(rentAmount))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function open(next: 'renew' | 'terminate') {
    setError(null)
    setMode(next)
  }

  async function submit(url: string, payload: Record<string, unknown>, onDone: (body: { contract?: { id: string } }) => void) {
    setLoading(true)
    setError(null)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(body.error ?? 'เกิดข้อผิดพลาด')
      return
    }
    onDone(body)
  }

  function handleRenew(e: React.FormEvent) {
    e.preventDefault()
    submit(
      '/api/admin/renew-contract',
      { contract_id: contractId, new_end_date: newEnd, rent_amount: Number(newRent) },
      body => {
        // The renewal creates a brand-new contract, so jump to it
        router.push(body.contract ? `/admin/contracts/${body.contract.id}` : '/admin/contracts')
        router.refresh()
      }
    )
  }

  function handleTerminate(e: React.FormEvent) {
    e.preventDefault()
    if (!window.confirm(`ยกเลิกสัญญาของ ${tenantName}? การยกเลิกไม่สามารถย้อนกลับได้`)) return
    submit('/api/admin/terminate-contract', { contract_id: contractId, note }, () => {
      router.refresh()
      setMode('none')
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
      <h2 className="text-base font-bold text-[#18181B] mb-1">จัดการสัญญา</h2>
      <p className="text-sm text-[#71717A] mb-5">ต่อสัญญาเมื่อผู้เช่าอยู่ต่อ หรือยกเลิกถ้าผู้เช่าย้ายออกก่อนครบกำหนด</p>

      {mode === 'none' && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => open('renew')}
            className="inline-flex items-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <RefreshCw size={15} />
            ต่อสัญญา
          </button>
          <button
            onClick={() => open('terminate')}
            className="inline-flex items-center gap-2 border border-[#FEE2E2] text-[#B91C1C] text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#FEE2E2] transition-colors"
          >
            <XCircle size={15} />
            ยกเลิกสัญญา
          </button>
        </div>
      )}

      {mode === 'renew' && (
        <form onSubmit={handleRenew} className="space-y-4">
          <p className="text-sm text-[#3F3F46]">
            สัญญาใหม่จะเริ่มต่อจากวันสิ้นสุดเดิม และสัญญาปัจจุบันจะถูกบันทึกเป็น &quot;ต่อสัญญาแล้ว&quot;
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#18181B] mb-2">วันสิ้นสุดใหม่</label>
              <input type="date" required min={endDate} value={newEnd} onChange={e => setNewEnd(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#18181B] mb-2">ค่าเช่า (บาท/เดือน)</label>
              <input type="number" required min={0} step={1} value={newRent} onChange={e => setNewRent(e.target.value)} className={inputClass} />
            </div>
          </div>
          {error && <p className="text-sm text-[#DC2626] bg-[#fee2e2] px-4 py-2.5 rounded-lg">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setMode('none')} className="px-5 py-2.5 border border-[#E4E4E7] text-[#3F3F46] text-sm font-semibold rounded-lg hover:border-[#C2410C] hover:text-[#C2410C] transition-colors">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'กำลังบันทึก…' : 'ยืนยันต่อสัญญา'}
            </button>
          </div>
        </form>
      )}

      {mode === 'terminate' && (
        <form onSubmit={handleTerminate} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#18181B] mb-2">เหตุผลที่ยกเลิก (ถ้ามี)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น ย้ายไปทำงานต่างจังหวัด" className={inputClass} />
          </div>
          {error && <p className="text-sm text-[#DC2626] bg-[#fee2e2] px-4 py-2.5 rounded-lg">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setMode('none')} className="px-5 py-2.5 border border-[#E4E4E7] text-[#3F3F46] text-sm font-semibold rounded-lg hover:border-[#C2410C] hover:text-[#C2410C] transition-colors">
              กลับ
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'กำลังบันทึก…' : 'ยืนยันยกเลิกสัญญา'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
