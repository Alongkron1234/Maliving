'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot } from 'lucide-react'

// Floating shortcut to the AI assistant chat, visible on every admin page except
// the assistant page itself (no point linking to where you already are).
export default function AgentFab() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin/agent')) return null

  return (
    <Link
      href="/admin/agent"
      aria-label="เปิดผู้ช่วย AI"
      className="agent-fab group fixed bottom-6 right-6 z-50 flex items-center h-14 pl-4 pr-4 rounded-full
                 bg-gradient-to-br from-[#FF8A3D] to-[#C2410C] text-white
                 shadow-[0_4px_16px_rgba(194,65,12,0.35)]
                 hover:pl-5 hover:pr-6 hover:shadow-[0_8px_28px_rgba(194,65,12,0.45)] hover:-translate-y-1
                 print:hidden"
    >
      {/* Soft pulsing halo behind the button — subtle, not distracting */}
      <span className="absolute inset-0 rounded-full bg-[#FF6A00]/40 animate-ping-slow -z-10" />

      <Bot size={22} strokeWidth={2.25} className="shrink-0" />

      {/* Label reveals on hover — same collapse/expand language as the sidebar rail */}
      <span
        className="max-w-0 group-hover:max-w-[8rem] overflow-hidden whitespace-nowrap
                   transition-[max-width] duration-300 ease-out"
      >
        <span className="pl-2 text-sm font-semibold">ผู้ช่วย AI</span>
      </span>
    </Link>
  )
}
