'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, ChevronDown } from 'lucide-react'

export default function AdminTopBar({ fullName }: { fullName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="hidden lg:flex items-center justify-end px-8 pt-5 print:hidden" ref={ref}>
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-white border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04)] hover:shadow-[0_2px_4px_rgba(36,25,18,0.08)] transition-shadow"
        >
          <span className="w-7 h-7 rounded-full bg-[#FFD9B3] flex items-center justify-center text-xs font-bold text-[#C2410C] shrink-0">
            {initials}
          </span>
          <span className="text-sm font-semibold text-[#18181B]">{fullName}</span>
          <ChevronDown size={14} className="text-[#71717A]" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-black/5 shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] py-1.5 z-50">
            <div className="px-3.5 py-2 border-b border-black/5">
              <p className="text-xs text-[#71717A]">ผู้ดูแลระบบ</p>
              <p className="text-sm font-semibold text-[#18181B] truncate">{fullName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-[#71717A] hover:bg-[#FFE8D1] hover:text-[#3F3F46] transition-colors"
            >
              <LogOut size={14} />
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
