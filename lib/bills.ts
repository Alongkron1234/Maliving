import type { BillStatus } from '@/lib/types/database'

export const billStatusConfig: Record<BillStatus, { label: string; className: string }> = {
  unpaid:  { label: 'ยังไม่ชำระ',   className: 'bg-[#FEF3C7] text-[#B45309]' },
  paid:    { label: 'ชำระแล้ว',     className: 'bg-[#e3f5ea] text-[#1e7e46]' },
  overdue: { label: 'เกินกำหนด',   className: 'bg-[#DC2626] text-white' },
}

export function getEffectiveBillStatus(bill: { status: BillStatus; due_date: string | null }): BillStatus {
  if (bill.status === 'unpaid' && bill.due_date && bill.due_date < new Date().toISOString().slice(0, 10)) {
    return 'overdue'
  }
  return bill.status
}