'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] p-8">

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#C2410C] tracking-tight">Maliving</h1>
          <p className="mt-1 text-sm text-[#71717A]">ระบบจัดการหอพัก</p>
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
              className="w-full px-3 py-2.5 bg-[#FFFAF7] rounded-lg text-sm text-[#18181B] border border-transparent
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
              className="w-full px-3 py-2.5 bg-[#FFFAF7] rounded-lg text-sm text-[#18181B] border border-transparent
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
      </div>
    </div>
  )
}
