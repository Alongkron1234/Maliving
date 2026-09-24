'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, AlertCircle } from 'lucide-react'

const inputClass =
  'w-20 h-[34px] px-2 bg-[#FFFAF7] border border-[#E4E4E7] rounded-lg text-sm text-[#18181B] ' +
  'outline-none focus:border-[#FF6A00] text-center transition-all'

export default function GenerateBillsPanel({
  month,
  year,
}: {
  month: number
  year: number
}) {
  const router = useRouter()
  const [eRate, setERate] = useState('')
  const [wRate, setWRate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; errors: { room: string; reason: string }[] } | null>(null)

  useEffect(() => {
    setERate(localStorage.getItem('maliving_electric_rate') ?? '8')
    setWRate(localStorage.getItem('maliving_water_rate') ?? '18')
  }, [])

  async function handleGenerate() {
    setError(null)
    setResult(null)
    setLoading(true)

    localStorage.setItem('maliving_electric_rate', eRate)
    localStorage.setItem('maliving_water_rate', wRate)

    const res = await fetch('/api/admin/generate-bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, electric_rate: eRate, water_rate: wRate }),
    })

    const body = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(body.error ?? 'Something went wrong')
      return
    }

    setResult({ created: body.bills.length, errors: body.errors })
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E4E4E7] px-5 py-4 shadow-[0_0_15px_rgba(144,77,0,0.06)] mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[#71717A]" />
          <span className="text-sm font-bold text-[#18181B]">ออกบิลเดือนนี้</span>
          <span className="text-xs text-[#A1A1AA]">· ใช้อัตราค่าน้ำ/ไฟเดียวกับหน้ามิเตอร์</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#71717A] whitespace-nowrap">⚡ ค่าไฟ</span>
            <input
              type="number"
              value={eRate}
              onChange={e => setERate(e.target.value)}
              min={0}
              step={0.5}
              placeholder="8"
              className={inputClass}
            />
            <span className="text-xs text-[#71717A]">฿/หน่วย</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#71717A] whitespace-nowrap">💧 ค่าน้ำ</span>
            <input
              type="number"
              value={wRate}
              onChange={e => setWRate(e.target.value)}
              min={0}
              step={0.5}
              placeholder="18"
              className={inputClass}
            />
            <span className="text-xs text-[#71717A]">฿/หน่วย</span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !eRate || !wRate}
            className="flex items-center gap-1.5 h-[34px] px-4 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'กำลังออกบิล…' : 'Generate Bills'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#DC2626] bg-[#FEE2E2] px-4 py-2.5 rounded-lg mt-4">{error}</p>
      )}

      {result && (
        <div className="mt-4 pt-4 border-t border-[#F4F4F5]">
          <p className="text-sm text-[#71717A] mb-2">
            ออกบิลสำเร็จ {result.created} ห้อง
            {result.errors.length > 0 && ` · ข้าม ${result.errors.length} ห้อง`}
          </p>
          {result.errors.length > 0 && (
            <div className="space-y-1.5">
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#FEF3C7] rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="text-[#B45309] shrink-0" />
                  <span className="text-xs font-medium text-[#B45309]">
                    Room {err.room}: {err.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}