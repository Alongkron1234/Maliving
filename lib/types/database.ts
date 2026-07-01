export type Role = 'admin' | 'tenant'
export type RoomStatus = 'available' | 'occupied' | 'maintenance'
export type TenantStatus = 'active' | 'inactive'
export type OcrBatchStatus = 'pending' | 'processing' | 'done' | 'failed'
export type MeterType = 'electric' | 'water'
export type InputMethod = 'manual' | 'ocr'
export type BillStatus = 'unpaid' | 'paid' | 'overdue'
export type PaymentMethod = 'cash' | 'transfer' | 'qr'
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type MaintenancePriority = 'low' | 'medium' | 'high'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  room_number: string
  floor: number | null
  rent_price: number
  status: RoomStatus
  created_at: string
  updated_at: string
}

export interface Tenant {
  id: string
  profile_id: string
  room_id: string
  move_in_date: string
  move_out_date: string | null
  status: TenantStatus
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  created_by: string | null
  title: string
  body: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface MaintenanceRequest {
  id: string
  room_id: string
  reported_by: string | null
  assigned_to: string | null
  title: string
  description: string | null
  status: MaintenanceStatus
  priority: MaintenancePriority
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface OcrBatch {
  id: string
  uploaded_by: string | null
  image_url: string
  status: OcrBatchStatus
  reading_month: number | null
  reading_year: number | null
  raw_result: unknown | null
  created_at: string
  updated_at: string
}

export interface OcrReading {
  room: string
  room_id: string
  electric?: number
  water?: number
}

export interface MeterReading {
  id: string
  room_id: string
  ocr_batch_id: string | null
  meter_type: MeterType
  reading_month: number
  reading_year: number
  previous_reading: number
  current_reading: number
  units_used: number
  input_method: InputMethod
  created_at: string
}

export interface Bill {
  id: string
  room_id: string
  tenant_id: string
  billing_month: number
  billing_year: number
  rent_amount: number
  electric_amount: number
  water_amount: number
  total_amount: number
  status: BillStatus
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  bill_id: string
  tenant_id: string
  amount: number
  method: PaymentMethod
  slip_url: string | null
  paid_at: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }
        Update: Partial<Omit<Profile, 'id' | 'created_at'>> & { updated_at?: string }
      }
      rooms: {
        Row: Room
        Insert: Omit<Room, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Room, 'id' | 'created_at'>> & { updated_at?: string }
      }
      tenants: {
        Row: Tenant
        Insert: Omit<Tenant, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Tenant, 'id' | 'created_at'>> & { updated_at?: string }
      }
      announcements: {
        Row: Announcement
        Insert: Omit<Announcement, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Announcement, 'id' | 'created_at'>> & { updated_at?: string }
      }
      maintenance_requests: {
        Row: MaintenanceRequest
        Insert: Omit<MaintenanceRequest, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<MaintenanceRequest, 'id' | 'created_at'>> & { updated_at?: string }
      }
      ocr_batches: {
        Row: OcrBatch
        Insert: Omit<OcrBatch, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<OcrBatch, 'id' | 'created_at'>> & { updated_at?: string }
      }
      meter_readings: {
        Row: MeterReading
        Insert: Omit<MeterReading, 'id' | 'units_used' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<MeterReading, 'id' | 'units_used' | 'created_at'>>
      }
      bills: {
        Row: Bill
        Insert: Omit<Bill, 'id' | 'total_amount' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Bill, 'id' | 'total_amount' | 'created_at'>> & { updated_at?: string }
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: never
      }
    }
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean }
      my_room_ids: { Args: Record<never, never>; Returns: string[] }
      my_tenant_ids: { Args: Record<never, never>; Returns: string[] }
    }
  }
}
