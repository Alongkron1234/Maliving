import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Home, Phone, Calendar, Wallet, Banknote } from 'lucide-react'
import type { Contract } from '@/lib/types/database'
import { contractStatusConfig, getEffectiveContractStatus, daysUntil } from '@/lib/contracts'
import ContractActions from './ContractActions'

type ContractDetail = Contract & {
  tenants: { profiles: { full_name: string; phone: string | null } | null } | null
  rooms: { room_number: string; floor: number | null } | null
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('contracts')
    .select('*, tenants(profiles(full_name, phone)), rooms(room_number, floor)')
    .eq('id', id)
    .single()
  const contract = raw as unknown as ContractDetail | null
  if (!contract) notFound()

  // The renewal chain: the contract this one replaced, and the one that replaced it
  const [{ data: prevRaw }, { data: nextRaw }] = await Promise.all([
    contract.renewed_from
      ? supabase.from('contracts').select('id, start_date, end_date').eq('id', contract.renewed_from).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('contracts').select('id, start_date, end_date').eq('renewed_from', contract.id).maybeSingle(),
  ])
  const prev = prevRaw as { id: string; start_date: string; end_date: string } | null
  const next = nextRaw as { id: string; start_date: string; end_date: string } | null

  const effective = getEffectiveContractStatus(contract)
  const cfg = contractStatusConfig[effective]
  const days = daysUntil(contract.end_date)
  const profile = contract.tenants?.profiles

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <Link
        href="/admin/contracts"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        กลับไปหน้าสัญญาเช่า
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">{profile?.full_name ?? '—'}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
          </div>
          <p className="text-sm text-[#71717A] mt-1.5">
            ห้อง {contract.rooms?.room_number ?? '—'}
            {(effective === 'active' || effective === 'expiring_soon') && days >= 0 && ` · เหลืออีก ${days} วัน`}
            {effective === 'expired' && ` · เลยกำหนดมาแล้ว ${Math.abs(days)} วัน`}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
          <h2 className="text-base font-bold text-[#18181B] mb-6">รายละเอียดสัญญา</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <Info icon={Home} label="ห้องพัก" value={`ห้อง ${contract.rooms?.room_number ?? '—'}${contract.rooms?.floor != null ? ` · ชั้น ${contract.rooms.floor}` : ''}`} />
            <Info icon={Phone} label="เบอร์โทรผู้เช่า" value={profile?.phone ?? '—'} />
            <Info icon={Calendar} label="วันเริ่มสัญญา" value={formatDate(contract.start_date)} />
            <Info icon={Calendar} label="วันสิ้นสุดสัญญา" value={formatDate(contract.end_date)} />
            <Info icon={Wallet} label="ค่าเช่า" value={`฿${contract.rent_amount.toLocaleString('th-TH')}/เดือน`} />
            <Info icon={Banknote} label="เงินมัดจำ" value={`฿${contract.deposit_amount.toLocaleString('th-TH')}`} />
          </div>
          {contract.status === 'terminated' && (
            <div className="mt-6 rounded-xl bg-[#F4F4F5] p-4">
              <p className="text-xs font-semibold text-[#71717A]">
                ยกเลิกเมื่อ {contract.terminated_at ? formatDate(contract.terminated_at.slice(0, 10)) : '—'}
              </p>
              {contract.termination_note && <p className="text-sm text-[#3F3F46] mt-1">เหตุผล: {contract.termination_note}</p>}
            </div>
          )}
        </div>

        {(prev || next) && (
          <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
            <h2 className="text-base font-bold text-[#18181B] mb-4">ประวัติการต่อสัญญา</h2>
            <div className="space-y-2">
              {prev && (
                <Link href={`/admin/contracts/${prev.id}`} className="block text-sm text-[#3F3F46] hover:text-[#C2410C] transition-colors">
                  ← ต่อมาจากสัญญาก่อนหน้า ({formatDate(prev.start_date)} – {formatDate(prev.end_date)})
                </Link>
              )}
              {next && (
                <Link href={`/admin/contracts/${next.id}`} className="block text-sm text-[#3F3F46] hover:text-[#C2410C] transition-colors">
                  → ถูกต่อเป็นสัญญาใหม่ ({formatDate(next.start_date)} – {formatDate(next.end_date)})
                </Link>
              )}
            </div>
          </div>
        )}

        {contract.status === 'active' && (
          <ContractActions
            contractId={contract.id}
            endDate={contract.end_date}
            rentAmount={contract.rent_amount}
            tenantName={profile?.full_name ?? ''}
          />
        )}
      </div>
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} className="text-[#A1A1AA]" />
        <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-semibold text-[#18181B]">{value}</p>
    </div>
  )
}
