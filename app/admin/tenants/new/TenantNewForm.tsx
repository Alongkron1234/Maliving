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
        <h2 className="text-base font-bold text-[#241912] mb-1">Tenant Information</h2>
        <p className="text-sm text-[#897362] mb-7">
          Fill in the details to register a new tenant and assign them a room.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
          <Field label="Full Name">
            <input
              name="full_name"
              type="text"
              required
              placeholder="e.g. Somchai Jaidee"
              className={inputClass}
            />
          </Field>

          <Field label="Phone Number">
            <input
              name="phone"
              type="tel"
              placeholder="e.g. 0812345678"
              className={inputClass}
            />
          </Field>

          <Field label="Email Address">
            <input
              name="email"
              type="email"
              required
              placeholder="tenant@example.com"
              className={inputClass}
            />
          </Field>

          <Field label="Password">
            <input
              name="password"
              type="text"
              required
              minLength={6}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className={inputClass}
            />
          </Field>

          <Field label="Assign Room">
            {rooms.length === 0 ? (
              <div className={`${inputClass} flex items-center text-[#897362] bg-[#fff1e9]`}>
                No available rooms
              </div>
            ) : (
              <select name="room_id" required defaultValue={defaultRoomId ?? ''} className={inputClass}>
                <option value="" disabled>Select a room</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number}{r.floor != null ? ` (Floor ${r.floor})` : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Move-in Date">
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
            All rooms are currently occupied or under maintenance.{' '}
            <Link href="/admin/rooms/new" className="text-[#ff8c00] font-semibold hover:text-[#904d00]">
              Add a new room
            </Link>{' '}
            first.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Link
          href="/admin/tenants"
          className="px-6 py-2.5 bg-white border border-[#ddc1ae] text-[#564334] text-sm font-semibold rounded-lg hover:border-[#904d00] hover:text-[#904d00] transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || rooms.length === 0}
          className="px-6 py-2.5 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding…' : 'Add Tenant'}
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