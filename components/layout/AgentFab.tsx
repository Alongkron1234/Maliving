'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// A little robot mascot face, drawn in the app's own palette (cream body, vivid
// orange antenna/ears, near-black eyes) instead of an icon-font glyph — same
// spirit as the cute reference image the user shared, recolored to match.
function RobotFaceIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* antenna */}
      <rect x="29" y="4" width="6" height="11" rx="3" fill="#FF8A3D" />
      <circle cx="32" cy="6" r="5.5" fill="#FF6A00" />
      {/* ears */}
      <circle cx="8" cy="38" r="7" fill="#FF6A00" />
      <circle cx="56" cy="38" r="7" fill="#FF6A00" />
      {/* head */}
      <rect x="10" y="16" width="44" height="40" rx="16" fill="#FFFFFF" stroke="#C2410C" strokeWidth="2.5" />
      {/* face plate */}
      <rect x="16" y="23" width="32" height="27" rx="12" fill="#FFE8D1" />
      {/* eyes */}
      <circle cx="25.5" cy="36" r="3" fill="#3F3F46" />
      <circle cx="38.5" cy="36" r="3" fill="#3F3F46" />
      {/* smile */}
      <path d="M25 43.5C27 46.5 37 46.5 39 43.5" stroke="#3F3F46" strokeWidth="2.25" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// Floating shortcut to the AI assistant chat, visible on every admin page except
// the assistant page itself (no point linking to where you already are).
export default function AgentFab() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin/agent')) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 print:hidden">
      {/* Label pill — revealed on hover of the group below */}
      <Link
        href="/admin/agent"
        aria-label="เปิดผู้ช่วย AI"
        className="group flex items-center gap-2"
      >
        <span
          className="max-w-0 group-hover:max-w-[7rem] overflow-hidden whitespace-nowrap
                     transition-[max-width] duration-300 ease-out"
        >
          <span className="inline-block bg-white text-[#C2410C] text-sm font-semibold px-3.5 py-2 rounded-full shadow-[0_2px_8px_rgba(36,25,18,0.12)]">
            ผู้ช่วย AI
          </span>
        </span>

        <span className="relative flex items-center justify-center w-14 h-14 shrink-0">
          {/* Soft pulsing halo behind the icon */}
          <span className="absolute inset-0 rounded-full bg-[#FF6A00]/35 animate-ping-slow" />
          <span
            className="relative flex items-center justify-center w-14 h-14 rounded-full bg-white
                       shadow-[0_4px_16px_rgba(194,65,12,0.3)]
                       transition-transform duration-300 ease-out
                       group-hover:-translate-y-1 group-hover:rotate-3 group-hover:shadow-[0_8px_24px_rgba(194,65,12,0.4)]"
          >
            <RobotFaceIcon />
          </span>
        </span>
      </Link>
    </div>
  )
}
