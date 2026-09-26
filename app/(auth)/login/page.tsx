'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { BedDouble, Zap, Receipt } from 'lucide-react'

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

        {/* Soft floating orbs — purely decorative */}
        <div className="absolute top-20 right-16 w-28 h-28 rounded-full bg-[#FF6A00]/25 blur-2xl animate-float-slow" />
        <div className="absolute bottom-40 left-10 w-20 h-20 rounded-full bg-white/20 blur-2xl animate-float-slower" />

        <div className="absolute inset-0 flex flex-col justify-between p-10">
          <Link href="/" className="animate-fade-in-up text-2xl font-bold text-white tracking-tight">
            Maliving
          </Link>
          <div>
            <h2 className="animate-fade-in-up text-3xl font-bold text-white tracking-tight max-w-md">
              จัดการหอพักของคุณได้ง่ายขึ้น ในที่เดียว
            </h2>
            <p className="animate-fade-in-up text-white/80 text-sm mt-3 max-w-sm" style={{ animationDelay: '100ms' }}>
              ห้องพัก ผู้เช่า มิเตอร์น้ำ/ไฟ บิล และแจ้งซ่อม ครบทุกอย่างที่หอพักต้องการ
            </p>
            <div className="flex items-center gap-5 mt-6">
              <div
                className="animate-fade-in-up group flex items-center gap-2 text-white/90 text-xs font-medium"
                style={{ animationDelay: '180ms' }}
              >
                <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <BedDouble size={15} />
                </span>
                จัดการห้องพัก
              </div>
              <div
                className="animate-fade-in-up group flex items-center gap-2 text-white/90 text-xs font-medium"
                style={{ animationDelay: '260ms' }}
              >
                <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <Zap size={15} />
                </span>
                มิเตอร์อัตโนมัติ
              </div>
              <div
                className="animate-fade-in-up group flex items-center gap-2 text-white/90 text-xs font-medium"
                style={{ animationDelay: '340ms' }}
              >
                <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
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
        <div className="w-full max-w-sm animate-fade-in-up">
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
                         rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-2"
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
