'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ProfileData = { id: string; full_name: string; phone: string | null }

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#FFFAF7] border border-[#E4E4E7] rounded-lg text-sm text-[#18181B] ' +
  'outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all ' +
  'placeholder:text-[#A1A1AA]'

export default function ProfileEditForm({ profile }: { profile: ProfileData }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setLoading(true)

    const form = e.currentTarget
    const full_name = (form.elements.namedItem('full_name') as HTMLInputElement).value.trim()
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value.trim()

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update({ full_name, phone: phone || null, updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
      <h2 className="text-base font-bold text-[#18181B] mb-1">แก้ไขข้อมูลส่วนตัว</h2>
      <p className="text-sm text-[#71717A] mb-6">อัปเดตชื่อและเบอร์โทรของคุณ</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5 mb-6">
        <Field label="ชื่อ-นามสกุล">
          <input name="full_name" type="text" required defaultValue={profile.full_name} className={inputClass} />
        </Field>
        <Field label="เบอร์โทร">
          <input name="phone" type="tel" defaultValue={profile.phone ?? ''} placeholder="08x-xxx-xxxx" className={inputClass} />
        </Field>
      </div>

      {error && (
        <p className="text-sm text-[#DC2626] bg-[#fee2e2] px-4 py-2.5 rounded-lg mb-6">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
          saved
            ? 'bg-[#e3f5ea] border border-[#1e7e46]/30 text-[#1e7e46]'
            : 'bg-[#FF6A00] hover:bg-[#C2410C] text-white shadow-sm shadow-[#FF6A00]/30 hover:shadow-md hover:-translate-y-0.5'
        }`}
      >
        {loading ? 'กำลังบันทึก…' : saved ? 'บันทึกแล้ว' : 'บันทึกการเปลี่ยนแปลง'}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#18181B] mb-2">{label}</label>
      {children}
    </div>
  )
}
