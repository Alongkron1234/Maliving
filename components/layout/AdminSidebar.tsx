'use client'

import { useState } from 'react'
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
  Bot,
  HelpCircle,
  LogOut,
  Menu,
  X,
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
  { href: '/admin/agent', label: 'ผู้ช่วย AI', icon: Bot },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Label text shown in the mobile drawer immediately (opacity-100), hidden at lg+
  // until the whole rail is hovered — that's what turns it into a collapsed icon
  // rail that flies out to full width on hover instead of taking up permanent space.
  const labelClass = 'opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap'

  return (
    <>
      {/* Mobile top bar — hidden on lg+ where the sidebar rail is always visible */}
      <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between h-14 px-4 bg-white border-b border-[#E4E4E7] print:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 text-[#3F3F46]"
          aria-label="เปิดเมนู"
        >
          <Menu size={20} />
        </button>
        <p className="text-sm font-bold text-[#C2410C]">Maliving Admin</p>
        <div className="w-9" />
      </header>

      {/* Backdrop for the mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar — off-canvas drawer on mobile; on lg+ it's a fixed, always-on-top
          icon rail (76px) that expands to a full flyout (256px) on hover, so it
          never pushes page content around — see lg:pl-[76px] on <main>. */}
      <aside
        className={`group/sidebar fixed inset-y-0 left-0 z-40 bg-white border-r border-[#E4E4E7] flex flex-col shrink-0 print:hidden overflow-hidden
                    w-64 transition-transform duration-200 ease-out
                    lg:w-[76px] lg:transition-[width] lg:duration-300 lg:ease-in-out lg:hover:w-64 lg:hover:shadow-[0_16px_40px_rgba(0,0,0,0.14)]
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#E4E4E7] shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#C2410C] flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div className={`min-w-0 ${labelClass}`}>
            <p className="text-sm font-bold text-[#C2410C] leading-tight">Maliving Admin</p>
            <p className="text-xs text-[#71717A] mt-0.5">Dormitory Management</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden ml-auto p-1 text-[#71717A] hover:text-[#3F3F46]"
            aria-label="ปิดเมนู"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                title={label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#FFD9B3] text-[#C2410C]'
                    : 'text-[#71717A] hover:bg-[#FFE8D1] hover:text-[#3F3F46] hover:translate-x-0.5'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span className={labelClass}>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-[#E4E4E7] space-y-0.5 shrink-0">
          <Link
            href="/admin/help"
            onClick={() => setIsOpen(false)}
            title="Help Center"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#71717A] hover:bg-[#FFE8D1] hover:text-[#3F3F46] transition-colors"
          >
            <HelpCircle size={18} strokeWidth={2} className="shrink-0" />
            <span className={labelClass}>Help Center</span>
          </Link>
          <button
            onClick={handleLogout}
            title="ออกจากระบบ"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#71717A] hover:bg-[#FFE8D1] hover:text-[#3F3F46] transition-colors"
          >
            <LogOut size={18} strokeWidth={2} className="shrink-0" />
            <span className={labelClass}>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  )
}
