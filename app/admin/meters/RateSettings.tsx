'use client'

import { useState, useEffect } from 'react'
import { Settings2, Check } from 'lucide-react'

const inputClass =
  'w-20 h-[34px] px-2 bg-[#fff8f5] border border-[#ddc1ae] rounded-lg text-sm text-[#241912] ' +
  'outline-none focus:border-[#ff8c00] text-center transition-all'

export default function RateSettings() {
  const [eRate, setERate] = useState('')
  const [wRate, setWRate] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setERate(localStorage.getItem('maliving_electric_rate') ?? '')
    setWRate(localStorage.getItem('maliving_water_rate') ?? '')
  }, [])

  function handleSave() {
    localStorage.setItem('maliving_electric_rate', eRate)
    localStorage.setItem('maliving_water_rate', wRate)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#ddc1ae] px-5 py-4 shadow-[0_0_15px_rgba(144,77,0,0.06)] mb-6 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <Settings2 size={14} className="text-[#897362]" />
        <span className="text-sm font-bold text-[#241912]">อัตราค่าสาธารณูปโภค</span>
        <span className="text-xs text-[#c9a990]">· ตั้งค่าทีเดียวใช้ทุกห้อง</span>
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
          onClick={handleSave}
          className={`flex items-center gap-1.5 h-[34px] px-4 text-xs font-semibold rounded-lg transition-colors ${
            saved
              ? 'bg-[#f0fdf4] border border-[#86efac] text-[#16a34a]'
              : 'bg-[#ff8c00] hover:bg-[#904d00] text-white'
          }`}
        >
          {saved ? (
            <><Check size={13} /> บันทึกแล้ว</>
          ) : (
            'บันทึกอัตรา'
          )}
        </button>
      </div>
    </div>
  )
}