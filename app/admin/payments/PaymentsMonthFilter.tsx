'use client'

import { useRouter } from 'next/navigation'

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

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
            ? 'bg-[#FF6A00] text-white shadow-sm shadow-[#FF6A00]/30'
            : 'bg-white border border-[#E4E4E7] text-[#3F3F46] hover:border-[#FF6A00] hover:text-[#C2410C]'
        }`}
      >
        ทั้งหมด
      </button>
      <select
        defaultValue={currentMonth}
        onChange={e => router.replace(`/admin/payments?month=${e.target.value}&year=${currentYear}`)}
        className="h-[36px] px-3 bg-white border border-[#E4E4E7] rounded-lg text-sm text-[#18181B] outline-none focus:border-[#FF6A00] transition-all cursor-pointer"
      >
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>
      <select
        defaultValue={currentYear}
        onChange={e => router.replace(`/admin/payments?month=${currentMonth}&year=${e.target.value}`)}
        className="h-[36px] px-3 bg-white border border-[#E4E4E7] rounded-lg text-sm text-[#18181B] outline-none focus:border-[#FF6A00] transition-all cursor-pointer"
      >
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
