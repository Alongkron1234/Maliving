'use client'

import { useRouter } from 'next/navigation'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function MeterMonthFilter({
  currentMonth,
  currentYear,
}: {
  currentMonth: number
  currentYear: number
}) {
  const router = useRouter()

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={currentMonth}
        onChange={e => router.replace(`/admin/meters?month=${e.target.value}&year=${currentYear}`)}
        className="h-[36px] px-3 bg-white border border-[#ddc1ae] rounded-lg text-sm text-[#241912] outline-none focus:border-[#ff8c00] transition-all cursor-pointer"
      >
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>
      <select
        defaultValue={currentYear}
        onChange={e => router.replace(`/admin/meters?month=${currentMonth}&year=${e.target.value}`)}
        className="h-[36px] px-3 bg-white border border-[#ddc1ae] rounded-lg text-sm text-[#241912] outline-none focus:border-[#ff8c00] transition-all cursor-pointer"
      >
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}