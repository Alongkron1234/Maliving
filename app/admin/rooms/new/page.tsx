'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewRoomPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'available' | 'maintenance'>('available')

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const room_number = (form.elements.namedItem('room_number') as HTMLInputElement).value.trim()
    const floor_raw = (form.elements.namedItem('floor') as HTMLSelectElement).value
    const rent_price = parseInt((form.elements.namedItem('rent_price') as HTMLInputElement).value)

    const supabase = createClient()
    // @ts-expect-error supabase-ssr@0.12 doesn't propagate Database generic to insert()
    const { error } = await supabase.from('rooms').insert({ room_number, floor: floor_raw ? parseInt(floor_raw) : null, rent_price, status })

    if (error) {
      setError(
        error.message.includes('unique')
          ? `Room "${room_number}" already exists`
          : error.message
      )
      setLoading(false)
      return
    }

    router.push('/admin/rooms')
    router.refresh()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-7">
        <Link
          href="/admin/rooms"
          className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] transition-colors mb-4"
        >
          <ArrowLeft size={15} />
          Back to Rooms
        </Link>
        <h1 className="text-2xl font-bold text-[#18181B]">Add New Room</h1>
        <p className="text-sm text-[#71717A] mt-1">Fill in the details to add a new unit to the inventory.</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl border border-[#E4E4E7] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
            <h2 className="text-base font-bold text-[#18181B] mb-1">Room Specifications</h2>
            <p className="text-sm text-[#71717A] mb-7">Complete the details below to add a new unit to the inventory.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
              {/* Row 1 */}
              <Field label="Room Number">
                <input
                  name="room_number"
                  type="text"
                  required
                  placeholder="e.g. 402-A"
                  className={inputClass}
                />
              </Field>

              <Field label="Floor Number">
                <select name="floor" className={inputClass}>
                  <option value="">Select Floor</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(f => (
                    <option key={f} value={f}>Floor {f}</option>
                  ))}
                </select>
              </Field>

              {/* Row 2 */}
              <Field label="Monthly Rent (฿)">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#71717A] font-medium select-none">฿</span>
                  <input
                    name="rent_price"
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </Field>

              <Field label="Status">
                <div className="flex gap-2 h-[42px]">
                  <button
                    type="button"
                    onClick={() => setStatus('available')}
                    className={`flex-1 rounded-lg text-sm font-semibold transition-colors ${
                      status === 'available'
                        ? 'bg-[#FF6A00] text-white shadow-sm'
                        : 'bg-[#FFE8D1] text-[#71717A] hover:bg-[#FFD9B3] hover:text-[#3F3F46]'
                    }`}
                  >
                    Available
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('maintenance')}
                    className={`flex-1 rounded-lg text-sm font-semibold transition-colors ${
                      status === 'maintenance'
                        ? 'bg-[#DC2626] text-white shadow-sm'
                        : 'bg-[#FFE8D1] text-[#71717A] hover:bg-[#FFD9B3] hover:text-[#3F3F46]'
                    }`}
                  >
                    Maintenance
                  </button>
                </div>
              </Field>
            </div>

            {error && (
              <p className="text-sm text-[#DC2626] bg-[#FEE2E2] px-4 py-2.5 rounded-lg mt-6">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <Link
              href="/admin/rooms"
              className="px-6 py-2.5 bg-white border border-[#E4E4E7] text-[#3F3F46] text-sm font-semibold rounded-lg hover:border-[#C2410C] hover:text-[#C2410C] transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding…' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#FFFAF7] border border-[#E4E4E7] rounded-lg text-sm text-[#18181B] ' +
  'outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all ' +
  'placeholder:text-[#A1A1AA]'