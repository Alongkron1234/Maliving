'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

export default function RoomsSearch({ initialQuery }: { initialQuery?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialQuery ?? '')

  // Debounce navigation so every keystroke doesn't trigger a server round-trip
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set('q', value)
      else params.delete('q')
      router.replace(`/admin/rooms?${params.toString()}`)
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative flex-1 max-w-xs">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#897362]" />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="ค้นหาห้อง หรือชื่อผู้เช่า..."
        className="w-full h-[38px] pl-9 pr-3 bg-white border border-[#ddc1ae] rounded-lg text-sm text-[#241912] outline-none focus:border-[#ff8c00] transition-all placeholder:text-[#c9a990]"
      />
    </div>
  )
}
