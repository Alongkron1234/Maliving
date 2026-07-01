'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  FileText,
  Wrench,
  Megaphone,
  User,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/tenant', label: 'แดชบอร์ด', icon: LayoutDashboard, exact: true },
  { href: '/tenant/bills', label: 'บิลของฉัน', icon: FileText },
  { href: '/tenant/maintenance', label: 'แจ้งซ่อม', icon: Wrench },
  { href: '/tenant/announcements', label: 'ประกาศ', icon: Megaphone },
  { href: '/tenant/profile', label: 'โปรไฟล์', icon: User },
]

export default function TenantTopNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-[#ddc1ae] sticky top-0 z-10 print:hidden">
      <div className="max-w-4xl mx-auto h-16 px-6 flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-[#904d00] leading-tight">Maliving</p>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#ffeadd] text-[#904d00]'
                    : 'text-[#897362] hover:bg-[#fff1e9] hover:text-[#564334]'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          title="ออกจากระบบ"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#897362] hover:bg-[#fff1e9] hover:text-[#564334] transition-colors shrink-0"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
