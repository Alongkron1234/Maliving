import type { BillStatus } from '@/lib/types/database'

export const billStatusConfig: Record<BillStatus, { label: string; className: string }> = {
  unpaid:  { label: 'Unpaid',  className: 'bg-[#ffdad6] text-[#93000a]' },
  paid:    { label: 'Paid',    className: 'bg-[#ffeadd] text-[#904d00]' },
  overdue: { label: 'Overdue', className: 'bg-[#ba1a1a] text-white' },
}

export function getEffectiveBillStatus(bill: { status: BillStatus; due_date: string | null }): BillStatus {
  if (bill.status === 'unpaid' && bill.due_date && bill.due_date < new Date().toISOString().slice(0, 10)) {
    return 'overdue'
  }
  return bill.status
}