import type { ExecutorFn } from './types'
import * as dashboard from './dashboard'
import * as rooms from './rooms'
import * as tenants from './tenants'
import * as meters from './meters'
import * as bills from './bills'
import * as payments from './payments'
import * as maintenance from './maintenance'
import * as announcements from './announcements'

export const executors: Record<string, ExecutorFn> = {
  get_dashboard_stats: dashboard.get_dashboard_stats,

  list_rooms: rooms.list_rooms,
  get_room: rooms.get_room,
  create_room: rooms.create_room,
  update_room: rooms.update_room,
  delete_room: rooms.delete_room,

  list_tenants: tenants.list_tenants,
  get_tenant: tenants.get_tenant,
  create_tenant: tenants.create_tenant,
  update_tenant: tenants.update_tenant,
  move_out_tenant: tenants.move_out_tenant,
  reset_tenant_password: tenants.reset_tenant_password,

  get_meter_status: meters.get_meter_status,
  list_meter_readings: meters.list_meter_readings,
  get_ocr_batch: meters.get_ocr_batch,
  run_meter_ocr: meters.run_meter_ocr,
  save_meter_reading: meters.save_meter_reading,
  save_meter_readings_bulk: meters.save_meter_readings_bulk,

  list_bills: bills.list_bills,
  get_bill: bills.get_bill,
  generate_bill: bills.generate_bill,
  delete_bill: bills.delete_bill,

  list_payments: payments.list_payments,
  record_payment: payments.record_payment,
  undo_payment: payments.undo_payment,

  list_maintenance_requests: maintenance.list_maintenance_requests,
  create_maintenance_request: maintenance.create_maintenance_request,
  update_maintenance_status: maintenance.update_maintenance_status,
  delete_maintenance_request: maintenance.delete_maintenance_request,

  list_announcements: announcements.list_announcements,
  create_announcement: announcements.create_announcement,
  update_announcement: announcements.update_announcement,
  delete_announcement: announcements.delete_announcement,
  toggle_pin_announcement: announcements.toggle_pin_announcement,
}
