'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Room, RoomStatus } from '@/lib/types/database'

export default function RoomEditForm({ room, hasActiveTenants }: { room: Room; hasActiveTenants: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<RoomStatus>(room.status)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const room_number = (form.elements.namedItem('room_number') as HTMLInputElement).value.trim()
    const floor_raw = (form.elements.namedItem('floor') as HTMLSelectElement).value
    const rent_price = parseInt((form.elements.namedItem('rent_price') as HTMLInputElement).value)

    const supabase = createClient()
    // cast: supabase-ssr@0.12 doesn't propagate Database generic to write methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('rooms')
      .update({
        room_number,
        floor: floor_raw ? parseInt(floor_raw) : null,
        rent_price,
        status: status as Room['status'],
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id)

    if (updateError) {
      setError(
        updateError.message.includes('unique')
          ? `Room "${room_number}" already exists`
          : updateError.message
      )
      setLoading(false)
      return
    }

    router.push(`/admin/rooms/${room.id}`)
    router.refresh()
  }

  const statusOptions: { value: RoomStatus; label: string; active: string; inactive: string }[] = [
    { value: 'available',   label: 'Available',   active: 'bg-[#ff8c00] text-white shadow-sm', inactive: 'bg-[#fff1e9] text-[#897362] hover:bg-[#ffeadd] hover:text-[#564334]' },
    { value: 'occupied',    label: 'Occupied',    active: 'bg-[#ffeadd] text-[#904d00] shadow-sm', inactive: 'bg-[#fff1e9] text-[#897362] hover:bg-[#ffeadd] hover:text-[#564334]' },
    { value: 'maintenance', label: 'Maintenance', active: 'bg-[#ba1a1a] text-white shadow-sm', inactive: 'bg-[#fff1e9] text-[#897362] hover:bg-[#ffeadd] hover:text-[#564334]' },
  ]

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
        <h2 className="text-base font-bold text-[#241912] mb-1">Room Specifications</h2>
        <p className="text-sm text-[#897362] mb-7">Update the details for this room unit.</p>

        <div className="grid grid-cols-2 gap-x-5 gap-y-6">
          <Field label="Room Number">
            <input
              name="room_number"
              type="text"
              required
              defaultValue={room.room_number}
              className={inputClass}
            />
          </Field>

          <Field label="Floor Number">
            <select name="floor" defaultValue={room.floor ?? ''} className={inputClass}>
              <option value="">No floor</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(f => (
                <option key={f} value={f}>Floor {f}</option>
              ))}
            </select>
          </Field>

          <Field label="Monthly Rent (฿)">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#897362] font-medium select-none">฿</span>
              <input
                name="rent_price"
                type="number"
                required
                min="1"
                defaultValue={room.rent_price}
                className={`${inputClass} pl-8`}
              />
            </div>
          </Field>

          <Field label="Status">
            <div className="flex gap-1.5 h-[42px]">
              {statusOptions.map(opt => {
                const locked = opt.value === 'available' && hasActiveTenants
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && setStatus(opt.value)}
                    title={locked ? 'Room still has active tenants — move them out first' : undefined}
                    className={`flex-1 rounded-lg text-xs font-semibold transition-colors ${
                      locked
                        ? 'opacity-40 cursor-not-allowed bg-[#fff1e9] text-[#897362]'
                        : status === opt.value ? opt.active : opt.inactive
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {hasActiveTenants && (
              <p className="text-xs text-[#897362] mt-2">
                "Available" is locked — move out all tenants before changing status.
              </p>
            )}
          </Field>
        </div>

        {error && (
          <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg mt-6">{error}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Link
          href={`/admin/rooms/${room.id}`}
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