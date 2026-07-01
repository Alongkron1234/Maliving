'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, AlertCircle } from 'lucide-react'

const inputClass =
  'w-20 h-[34px] px-2 bg-[#fff8f5] border border-[#ddc1ae] rounded-lg text-sm text-[#241912] ' +
  'outline-none focus:border-[#ff8c00] text-center transition-all'

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
    setERate(localStorage.getItem('maliving_electric_rate') ?? '')
    setWRate(localStorage.getItem('maliving_water_rate') ?? '')
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
    <div className="bg-white rounded-2xl border border-[#ddc1ae] px-5 py-4 shadow-[0_0_15px_rgba(144,77,0,0.06)] mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[#897362]" />
          <span className="text-sm font-bold text-[#241912]">ออกบิลเดือนนี้</span>
          <span className="text-xs text-[#c9a990]">· ใช้อัตราค่าน้ำ/ไฟเดียวกับหน้ามิเตอร์</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#897362] whitespace-nowrap">⚡ ค่าไฟ</span>
            <input
              type="number"
              value={eRate}
              onChange={e => setERate(e.target.value)}
              min={0}
              step={0.5}
              placeholder="5"
              className={inputClass}
            />
            <span className="text-xs text-[#897362]">฿/หน่วย</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#897362] whitespace-nowrap">💧 ค่าน้ำ</span>
            <input
              type="number"
              value={wRate}
              onChange={e => setWRate(e.target.value)}
              min={0}
              step={0.5}
              placeholder="18"
              className={inputClass}
            />
            <span className="text-xs text-[#897362]">฿/หน่วย</span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !eRate || !wRate}
            className="flex items-center gap-1.5 h-[34px] px-4 bg-[#ff8c00] hover:bg-[#904d00] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'กำลังออกบิล…' : 'Generate Bills'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg mt-4">{error}</p>
      )}

      {result && (
        <div className="mt-4 pt-4 border-t border-[#f0e0d4]">
          <p className="text-sm text-[#897362] mb-2">
            ออกบิลสำเร็จ {result.created} ห้อง
            {result.errors.length > 0 && ` · ข้าม ${result.errors.length} ห้อง`}
          </p>
          {result.errors.length > 0 && (
            <div className="space-y-1.5">
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#fff3cd] rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="text-[#8a6100] shrink-0" />
                  <span className="text-xs font-medium text-[#8a6100]">
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