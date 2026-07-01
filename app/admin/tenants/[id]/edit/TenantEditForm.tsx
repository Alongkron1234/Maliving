'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type TenantForEdit = {
  id: string
  move_in_date: string
  profiles: { id: string; full_name: string; phone: string | null }
}

export default function TenantEditForm({ tenant }: { tenant: TenantForEdit }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const full_name = (form.elements.namedItem('full_name') as HTMLInputElement).value.trim()
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value.trim()
    const move_in_date = (form.elements.namedItem('move_in_date') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value.trim()

    // Password change needs the Admin API (service role) — can't go through RLS like the rest of this form
    if (password) {
      const res = await fetch('/api/admin/reset-tenant-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: tenant.profiles.id, password }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Failed to reset password')
        setLoading(false)
        return
      }
    }

    const supabase = createClient()

    // Update profile (full_name + phone)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (supabase as any)
      .from('profiles')
      .update({ full_name, phone: phone || null, updated_at: new Date().toISOString() })
      .eq('id', tenant.profiles.id)

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // Update tenant move_in_date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: tenantError } = await (supabase as any)
      .from('tenants')
      .update({ move_in_date, updated_at: new Date().toISOString() })
      .eq('id', tenant.id)

    if (tenantError) {
      setError(tenantError.message)
      setLoading(false)
      return
    }

    router.push(`/admin/tenants/${tenant.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
        <h2 className="text-base font-bold text-[#241912] mb-1">Tenant Information</h2>
        <p className="text-sm text-[#897362] mb-7">Update the personal details for this tenant.</p>

        <div className="grid grid-cols-2 gap-x-5 gap-y-6">
          <Field label="Full Name">
            <input
              name="full_name"
              type="text"
              required
              defaultValue={tenant.profiles.full_name}
              className={inputClass}
            />
          </Field>

          <Field label="Phone Number">
            <input
              name="phone"
              type="tel"
              defaultValue={tenant.profiles.phone ?? ''}
              placeholder="e.g. 0812345678"
              className={inputClass}
            />
          </Field>

          <Field label="Move-in Date">
            <input
              name="move_in_date"
              type="date"
              required
              defaultValue={tenant.move_in_date}
              className={inputClass}
            />
          </Field>

          <div className="col-span-2">
            <Field label="Reset Password">
              <input
                name="password"
                type="text"
                minLength={6}
                placeholder="เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน — อย่างน้อย 6 ตัวอักษร"
                className={inputClass}
              />
              <p className="text-xs text-[#897362] mt-1.5">
                ระบบเก็บรหัสผ่านแบบเข้ารหัสทางเดียว จึงไม่สามารถแสดงรหัสผ่านเดิมได้ — กรอกที่นี่เพื่อ<strong>ตั้งรหัสใหม่ทับ</strong>เท่านั้น
              </p>
            </Field>
          </div>
        </div>

        {error && (
          <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg mt-6">{error}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Link
          href={`/admin/tenants/${tenant.id}`}
          className="px-6 py-2.5 bg-white border border-[#ddc1ae] text-[#564334] text-sm font-semibold rounded-lg hover:border-[#904d00] hover:text-[#904d00] transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#241912] mb-2">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#fff8f5] border border-[#ddc1ae] rounded-lg text-sm text-[#241912] ' +
  'outline-none focus:border-[#ff8c00] focus:ring-2 focus:ring-[#ff8c00]/20 transition-all ' +
  'placeholder:text-[#c9a990]'