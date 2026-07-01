'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  BedDouble,
  Users,
  Zap,
  FileText,
  CreditCard,
  Wrench,
  Megaphone,
  HelpCircle,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'แดชบอร์ด', icon: LayoutDashboard, exact: true },
  { href: '/admin/rooms', label: 'ห้องพัก', icon: BedDouble },
  { href: '/admin/tenants', label: 'ผู้เช่า', icon: Users },
  { href: '/admin/meters', label: 'มิเตอร์', icon: Zap },
  { href: '/admin/bills', label: 'บิล', icon: FileText },
  { href: '/admin/payments', label: 'ชำระเงิน', icon: CreditCard },
  { href: '/admin/maintenance', label: 'แจ้งซ่อม', icon: Wrench },
  { href: '/admin/announcements', label: 'ประกาศ', icon: Megaphone },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-[#ddc1ae] flex flex-col shrink-0 print:hidden">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#ddc1ae]">
        <p className="text-base font-bold text-[#904d00] leading-tight">Maliving Admin</p>
        <p className="text-xs text-[#897362] mt-0.5">Dormitory Management</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#ffeadd] text-[#904d00]'
                  : 'text-[#897362] hover:bg-[#fff1e9] hover:text-[#564334]'
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#ddc1ae] space-y-0.5">
        <Link
          href="/admin/help"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#897362] hover:bg-[#fff1e9] hover:text-[#564334] transition-colors"
        >
          <HelpCircle size={16} strokeWidth={2} />
          Help Center
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#897362] hover:bg-[#fff1e9] hover:text-[#564334] transition-colors"
        >
          <LogOut size={16} strokeWidth={2} />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
