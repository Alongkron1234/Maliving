'use client'

import { useRouter } from 'next/navigation'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function PaymentsMonthFilter({
  currentMonth,
  currentYear,
  showAll,
}: {
  currentMonth: number
  currentYear: number
  showAll: boolean
}) {
  const router = useRouter()

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => router.replace('/admin/payments?view=all')}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          showAll
            ? 'bg-[#ff8c00] text-white'
            : 'bg-white border border-[#ddc1ae] text-[#564334] hover:border-[#ff8c00] hover:text-[#904d00]'
        }`}
      >
        ทั้งหมด
      </button>
      <select
        defaultValue={currentMonth}
        onChange={e => router.replace(`/admin/payments?month=${e.target.value}&year=${currentYear}`)}
        className="h-[36px] px-3 bg-white border border-[#ddc1ae] rounded-lg text-sm text-[#241912] outline-none focus:border-[#ff8c00] transition-all cursor-pointer"
      >
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>
      <select
        defaultValue={currentYear}
        onChange={e => router.replace(`/admin/payments?month=${currentMonth}&year=${e.target.value}`)}
        className="h-[36px] px-3 bg-white border border-[#ddc1ae] rounded-lg text-sm text-[#241912] outline-none focus:border-[#ff8c00] transition-all cursor-pointer"
      >
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
