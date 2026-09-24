'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type RoomOption = {
  id: string
  room_number: string
  floor: number | null
}

export default function TenantNewForm({
  rooms,
  defaultRoomId,
}: {
  rooms: RoomOption[]
  defaultRoomId?: string
}) {
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
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const room_id = (form.elements.namedItem('room_id') as HTMLSelectElement).value
    const move_in_date = (form.elements.namedItem('move_in_date') as HTMLInputElement).value

    const res = await fetch('/api/admin/create-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, phone: phone || null, email, password, room_id, move_in_date }),
    })

    const body = await res.json()

    if (!res.ok) {
      setError(body.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/admin/tenants')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
        <h2 className="text-base font-bold text-[#241912] mb-1">ข้อมูลผู้เช่า</h2>
        <p className="text-sm text-[#897362] mb-7">
          กรอกรายละเอียดเพื่อลงทะเบียนผู้เช่าใหม่และมอบหมายห้องพัก
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
          <Field label="ชื่อ-นามสกุล">
            <input
              name="full_name"
              type="text"
              required
              placeholder="เช่น สมชาย ใจดี"
              className={inputClass}
            />
          </Field>

          <Field label="เบอร์โทรศัพท์">
            <input
              name="phone"
              type="tel"
              placeholder="เช่น 0812345678"
              className={inputClass}
            />
          </Field>

          <Field label="อีเมล">
            <input
              name="email"
              type="email"
              required
              placeholder="tenant@example.com"
              className={inputClass}
            />
          </Field>

          <Field label="รหัสผ่าน">
            <input
              name="password"
              type="text"
              required
              minLength={6}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className={inputClass}
            />
          </Field>

          <Field label="ห้องพัก">
            {rooms.length === 0 ? (
              <div className={`${inputClass} flex items-center text-[#897362] bg-[#fff1e9]`}>
                ไม่มีห้องว่าง
              </div>
            ) : (
              <select name="room_id" required defaultValue={defaultRoomId ?? ''} className={inputClass}>
                <option value="" disabled>เลือกห้อง</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    ห้อง {r.room_number}{r.floor != null ? ` (ชั้น ${r.floor})` : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="วันที่เข้าพัก">
            <input
              name="move_in_date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </Field>
        </div>

        {error && (
          <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg mt-6">{error}</p>
        )}

        {rooms.length === 0 && (
          <p className="text-sm text-[#897362] bg-[#fff1e9] px-4 py-2.5 rounded-lg mt-6">
            ทุกห้องมีผู้เช่าหรืออยู่ระหว่างซ่อมบำรุง{' '}
            <Link href="/admin/rooms/new" className="text-[#ff8c00] font-semibold hover:text-[#904d00]">
              เพิ่มห้องใหม่
            </Link>{' '}
            ก่อน
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Link
          href="/admin/tenants"
          className="px-6 py-2.5 bg-white border border-[#ddc1ae] text-[#564334] text-sm font-semibold rounded-lg hover:border-[#904d00] hover:text-[#904d00] transition-colors"
        >
          ยกเลิก
        </Link>
        <button
          type="submit"
          disabled={loading || rooms.length === 0}
          className="px-6 py-2.5 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'กำลังเพิ่ม…' : 'เพิ่มผู้เช่า'}
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
