import type { ContractStatus } from '@/lib/types/database'

export const EXPIRING_SOON_DAYS = 30

// The database only stores active / renewed / terminated. "expiring soon" and "expired" are
// worked out from end_date each time we read, so they can never go stale.
export type EffectiveContractStatus = ContractStatus | 'expiring_soon' | 'expired'

export const contractStatusConfig: Record<EffectiveContractStatus, { label: string; className: string }> = {
  active:        { label: 'มีผลอยู่',       className: 'bg-[#e3f5ea] text-[#1e7e46]' },
  expiring_soon: { label: 'ใกล้หมดสัญญา',  className: 'bg-[#FEF3C7] text-[#B45309]' },
  expired:       { label: 'หมดสัญญาแล้ว',  className: 'bg-[#DC2626] text-white' },
  renewed:       { label: 'ต่อสัญญาแล้ว',  className: 'bg-[#EEF4FF] text-[#2563EB]' },
  terminated:    { label: 'ยกเลิกแล้ว',    className: 'bg-[#F4F4F5] text-[#71717A]' },
}

// Whole days from today until the given YYYY-MM-DD date (negative = already passed)
export function daysUntil(dateStr: string, today = new Date()): number {
  const end = new Date(dateStr + 'T00:00:00')
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

export function getEffectiveContractStatus(c: { status: ContractStatus; end_date: string }): EffectiveContractStatus {
  if (c.status !== 'active') return c.status
  const days = daysUntil(c.end_date)
  if (days < 0) return 'expired'
  if (days <= EXPIRING_SOON_DAYS) return 'expiring_soon'
  return 'active'
}

// Add months to a YYYY-MM-DD date, clamping to the end of a shorter month
// (31 Jan + 1 month = 28/29 Feb, not 3 Mar)
export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() !== day) d.setDate(0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
