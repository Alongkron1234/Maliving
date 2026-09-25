'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { BedDouble, Zap, Receipt } from 'lucide-react'
import LoginHoverNavbar from './LoginHoverNavbar'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
      return
    }

    const role = data.user?.app_metadata?.role
    router.push(role === 'admin' ? '/admin' : '/tenant')
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <LoginHoverNavbar />
      {/* Left — decorative hero panel, hidden on small screens */}
      <div className="hidden lg:block relative overflow-hidden">
        <Image
          src="/images/dormitory-hero.webp"
          alt="อาคารหอพัก Maliving"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-0 flex flex-col justify-between p-10">
          <Link href="/" className="text-2xl font-bold text-white tracking-tight">
            Maliving
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight max-w-md">
              จัดการหอพักของคุณได้ง่ายขึ้น ในที่เดียว
            </h2>
            <p className="text-white/80 text-sm mt-3 max-w-sm">
              ห้องพัก ผู้เช่า มิเตอร์น้ำ/ไฟ บิล และแจ้งซ่อม ครบทุกอย่างที่หอพักต้องการ
            </p>
            <div className="flex items-center gap-5 mt-6">
              <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
                <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <BedDouble size={15} />
                </span>
                จัดการห้องพัก
              </div>
              <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
                <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Zap size={15} />
                </span>
                มิเตอร์อัตโนมัติ
              </div>
              <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
                <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Receipt size={15} />
                </span>
                ออกบิลอัตโนมัติ
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex items-center justify-center px-4 py-16 bg-[#FFFAF7]">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <Link href="/" className="lg:hidden inline-block text-2xl font-bold text-[#C2410C] tracking-tight mb-6">
              Maliving
            </Link>
            <h1 className="text-2xl font-bold text-[#18181B] tracking-tight">ยินดีต้อนรับกลับมา</h1>
            <p className="mt-1.5 text-sm text-[#71717A]">เข้าสู่ระบบเพื่อจัดการหอพักของคุณ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#18181B] mb-1.5">
                อีเมล
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 bg-white rounded-lg text-sm text-[#18181B] border border-[#E4E4E7]
                           outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all
                           placeholder:text-[#A1A1AA]"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-[#18181B] mb-1.5">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 bg-white rounded-lg text-sm text-[#18181B] border border-[#E4E4E7]
                           outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all
                           placeholder:text-[#A1A1AA]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-[#DC2626] bg-[#fee2e2] px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold
                         rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm mt-2"
            >
              {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <p className="text-center text-xs text-[#A1A1AA] mt-8">
            © {new Date().getFullYear()} Maliving. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
