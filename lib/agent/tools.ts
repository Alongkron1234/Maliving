export type ToolMode = 'read' | 'write'

export interface ToolDef {
  name: string
  mode: ToolMode
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

const str = (description: string) => ({ type: 'string', description })
const num = (description: string) => ({ type: 'number', description })
const bool = (description: string) => ({ type: 'boolean', description })
const enumStr = (description: string, values: string[]) => ({ type: 'string', description, enum: values })

export const agentTools: ToolDef[] = [
  // ---------- Read-only ----------
  {
    name: 'list_rooms',
    mode: 'read',
    description: 'แสดงรายการห้องพักทั้งหมด พร้อมสถานะ ชั้น ค่าเช่า และผู้เช่าปัจจุบัน (ถ้ามี)',
    parameters: {
      type: 'object',
      properties: {
        status: enumStr('กรองตามสถานะห้อง (ไม่ใส่ = ทุกสถานะ)', ['available', 'occupied', 'maintenance']),
      },
    },
  },
  {
    name: 'get_room',
    mode: 'read',
    description: 'ดูรายละเอียดห้องเดียว ระบุด้วย room_id หรือ room_number อย่างใดอย่างหนึ่ง',
    parameters: {
      type: 'object',
      properties: {
        room_id: str('UUID ของห้อง'),
        room_number: str('เลขห้อง เช่น "101"'),
      },
    },
  },
  {
    name: 'list_tenants',
    mode: 'read',
    description: 'แสดงรายชื่อผู้เช่า พร้อมห้อง เบอร์โทร วันที่เข้าอยู่',
    parameters: {
      type: 'object',
      properties: {
        status: enumStr('กรองตามสถานะผู้เช่า (ไม่ใส่ = ทุกสถานะ)', ['active', 'inactive']),
      },
    },
  },
  {
    name: 'get_tenant',
    mode: 'read',
    description: 'ดูรายละเอียดผู้เช่าคนเดียว พร้อมประวัติบิล ระบุด้วย tenant_id, room_number หรือ phone',
    parameters: {
      type: 'object',
      properties: {
        tenant_id: str('UUID ของ tenant record'),
        room_number: str('เลขห้องที่ผู้เช่าอยู่'),
        phone: str('เบอร์โทรผู้เช่า'),
      },
    },
  },
  {
    name: 'get_meter_status',
    mode: 'read',
    description: 'เช็คว่าห้องไหนมี/ไม่มีข้อมูลมิเตอร์ไฟและน้ำครบสำหรับเดือนที่ระบุ (ใช้ตัดสินใจว่าออกบิลห้องไหนได้)',
    parameters: {
      type: 'object',
      properties: {
        month: num('เดือน 1-12'),
        year: num('ปี ค.ศ.'),
      },
      required: ['month', 'year'],
    },
  },
  {
    name: 'list_meter_readings',
    mode: 'read',
    description: 'แสดงเลขมิเตอร์ที่บันทึกไว้แล้ว กรองตามห้อง/เดือน/ปีได้',
    parameters: {
      type: 'object',
      properties: {
        room_number: str('เลขห้อง (ไม่ใส่ = ทุกห้อง)'),
        month: num('เดือน 1-12'),
        year: num('ปี ค.ศ.'),
      },
    },
  },
  {
    name: 'list_bills',
    mode: 'read',
    description: 'แสดงรายการบิล กรองตามเดือน/ปี/สถานะได้ (สถานะ overdue คำนวณสดจาก due_date)',
    parameters: {
      type: 'object',
      properties: {
        month: num('เดือน 1-12'),
        year: num('ปี ค.ศ.'),
        status: enumStr('กรองตามสถานะบิล', ['unpaid', 'paid', 'overdue']),
      },
    },
  },
  {
    name: 'get_bill',
    mode: 'read',
    description: 'ดูรายละเอียดบิลเดียว',
    parameters: {
      type: 'object',
      properties: { bill_id: str('UUID ของบิล') },
      required: ['bill_id'],
    },
  },
  {
    name: 'list_payments',
    mode: 'read',
    description: 'แสดงประวัติการชำระเงิน กรองตามเดือน/ปีได้ (ไม่ใส่ = เดือนปัจจุบัน)',
    parameters: {
      type: 'object',
      properties: {
        month: num('เดือน 1-12'),
        year: num('ปี ค.ศ.'),
        all: bool('true = แสดงทุกเดือนไม่กรอง'),
      },
    },
  },
  {
    name: 'list_maintenance_requests',
    mode: 'read',
    description: 'แสดงรายการแจ้งซ่อม กรองตามสถานะได้',
    parameters: {
      type: 'object',
      properties: {
        status: enumStr('กรองตามสถานะ', ['open', 'in_progress', 'resolved', 'closed']),
      },
    },
  },
  {
    name: 'list_announcements',
    mode: 'read',
    description: 'แสดงประกาศทั้งหมด (ปักหมุดขึ้นก่อน)',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_dashboard_stats',
    mode: 'read',
    description: 'สรุปภาพรวม: รายได้เดือนนี้ อัตราการเข้าพัก บิลค้างชำระ ห้องที่ข้อมูลมิเตอร์ยังไม่ครบ',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_ocr_batch',
    mode: 'read',
    description: 'ดูผลลัพธ์ OCR ของ batch หนึ่ง (draft ที่ยังไม่ยืนยัน)',
    parameters: {
      type: 'object',
      properties: { batch_id: str('UUID ของ ocr batch') },
      required: ['batch_id'],
    },
  },

  // ---------- Effectful but non-destructive (auto-run, result is still a draft) ----------
  {
    name: 'run_meter_ocr',
    mode: 'read',
    description:
      'สั่งอ่านรูปมิเตอร์ที่ผู้ใช้แนบมาด้วย Groq Vision OCR สำหรับเดือน/ปีที่ระบุ คืนค่าเลขมิเตอร์แต่ละห้องเป็น draft ' +
      '(ยังไม่บันทึกลงระบบจริง ต้องเรียก save_meter_reading และรอ confirm ก่อนเสมอ) ' +
      'ใช้เฉพาะเมื่อผู้ใช้แนบรูปมิเตอร์มาในข้อความเท่านั้น (image_path จะถูกใส่มาให้ในบริบทข้อความ)',
    parameters: {
      type: 'object',
      properties: {
        image_path: str('path ของรูปที่อัปโหลดไว้แล้วใน storage (ได้จากบริบทข้อความผู้ใช้)'),
        month: num('เดือน 1-12 ของรอบมิเตอร์นี้'),
        year: num('ปี ค.ศ. ของรอบมิเตอร์นี้'),
      },
      required: ['image_path', 'month', 'year'],
    },
  },

  // ---------- Write: meters & bills ----------
  {
    name: 'save_meter_reading',
    mode: 'write',
    description: 'บันทึกเลขมิเตอร์ไฟและน้ำของห้องหนึ่งสำหรับเดือน/ปีที่ระบุลงระบบจริง (ปลดล็อกให้ออกบิลห้องนี้ได้)',
    parameters: {
      type: 'object',
      properties: {
        room_number: str('เลขห้อง'),
        month: num('เดือน 1-12'),
        year: num('ปี ค.ศ.'),
        electric_current: num('เลขมิเตอร์ไฟปัจจุบัน'),
        electric_previous: num('เลขมิเตอร์ไฟเดือนก่อน (ไม่ใส่ = 0)'),
        water_current: num('เลขมิเตอร์น้ำปัจจุบัน'),
        water_previous: num('เลขมิเตอร์น้ำเดือนก่อน (ไม่ใส่ = 0)'),
        input_method: enumStr('manual หรือ ocr', ['manual', 'ocr']),
        ocr_batch_id: str('UUID ของ ocr batch ถ้ามาจาก OCR'),
      },
      required: ['room_number', 'month', 'year', 'electric_current', 'water_current'],
    },
  },
  {
    name: 'save_meter_readings_bulk',
    mode: 'write',
    description:
      'บันทึกเลขมิเตอร์ไฟและน้ำของหลายห้องพร้อมกันในคำสั่งเดียว ใช้เมื่อผู้ใช้ขอให้ทำหลายห้อง/ทุกห้องพร้อมกัน ' +
      '(เช่น "กรอกเลขมิเตอร์มั่วๆ ให้ทุกห้องเลย") — ห้ามเรียก save_meter_reading วนหลายครั้งแทน ให้ใช้ตัวนี้ตัวเดียวแล้วใส่ทุกห้องใน readings',
    parameters: {
      type: 'object',
      properties: {
        month: num('เดือน 1-12 ของทุกห้องในชุดนี้'),
        year: num('ปี ค.ศ. ของทุกห้องในชุดนี้'),
        readings: {
          type: 'array',
          description: 'รายการเลขมิเตอร์ต่อห้อง อย่างน้อย 1 รายการ',
          items: {
            type: 'object',
            properties: {
              room_number: str('เลขห้อง'),
              electric_current: num('เลขมิเตอร์ไฟปัจจุบัน'),
              electric_previous: num('เลขมิเตอร์ไฟเดือนก่อน (ไม่ใส่ = 0)'),
              water_current: num('เลขมิเตอร์น้ำปัจจุบัน'),
              water_previous: num('เลขมิเตอร์น้ำเดือนก่อน (ไม่ใส่ = 0)'),
            },
            required: ['room_number', 'electric_current', 'water_current'],
          },
        },
      },
      required: ['month', 'year', 'readings'],
    },
  },
  {
    name: 'generate_bill',
    mode: 'write',
    description: 'ออกบิลสำหรับเดือน/ปีที่ระบุ ระบุ room_number เพื่อออกบิลห้องเดียว หรือไม่ใส่เพื่อออกบิลทุกห้องที่พร้อม',
    parameters: {
      type: 'object',
      properties: {
        room_number: str('เลขห้อง (ไม่ใส่ = ออกบิลทุกห้องที่มีข้อมูลมิเตอร์ครบ)'),
        month: num('เดือน 1-12'),
        year: num('ปี ค.ศ.'),
        electric_rate: num('ค่าไฟต่อหน่วย (บาท) — ไม่ใส่ = ใช้ค่า default 8'),
        water_rate: num('ค่าน้ำต่อหน่วย (บาท) — ไม่ใส่ = ใช้ค่า default 18'),
      },
      required: ['month', 'year'],
    },
  },
  {
    name: 'delete_bill',
    mode: 'write',
    description: 'ลบบิล (ลบการชำระเงินที่ผูกอยู่ด้วย) — ทำแล้วกู้คืนไม่ได้',
    parameters: {
      type: 'object',
      properties: { bill_id: str('UUID ของบิล') },
      required: ['bill_id'],
    },
  },
  {
    name: 'record_payment',
    mode: 'write',
    description: 'บันทึกว่าบิลนี้ชำระเงินแล้ว',
    parameters: {
      type: 'object',
      properties: {
        bill_id: str('UUID ของบิล'),
        method: enumStr('ช่องทางชำระเงิน', ['cash', 'transfer', 'qr']),
        paid_at: str('วันที่ชำระ (YYYY-MM-DD) — ไม่ใส่ = วันนี้'),
      },
      required: ['bill_id', 'method'],
    },
  },
  {
    name: 'undo_payment',
    mode: 'write',
    description: 'ยกเลิกการชำระเงิน คืนบิลเป็นสถานะยังไม่จ่าย',
    parameters: {
      type: 'object',
      properties: { bill_id: str('UUID ของบิล') },
      required: ['bill_id'],
    },
  },

  // ---------- Write: rooms ----------
  {
    name: 'create_room',
    mode: 'write',
    description: 'เพิ่มห้องพักใหม่',
    parameters: {
      type: 'object',
      properties: {
        room_number: str('เลขห้อง'),
        floor: num('ชั้น'),
        rent_price: num('ค่าเช่าต่อเดือน (บาท)'),
        status: enumStr('สถานะเริ่มต้น', ['available', 'maintenance']),
      },
      required: ['room_number', 'rent_price'],
    },
  },
  {
    name: 'update_room',
    mode: 'write',
    description: 'แก้ไขข้อมูลห้อง',
    parameters: {
      type: 'object',
      properties: {
        room_id: str('UUID ของห้อง'),
        room_number: str('เลขห้องใหม่'),
        floor: num('ชั้นใหม่'),
        rent_price: num('ค่าเช่าใหม่'),
        status: enumStr('สถานะใหม่', ['available', 'occupied', 'maintenance']),
      },
      required: ['room_id'],
    },
  },
  {
    name: 'delete_room',
    mode: 'write',
    description: 'ลบห้อง — ลบข้อมูลบิล การชำระเงิน มิเตอร์ แจ้งซ่อม และผู้เช่าของห้องนี้ทั้งหมดด้วย ทำแล้วกู้คืนไม่ได้',
    parameters: {
      type: 'object',
      properties: { room_id: str('UUID ของห้อง') },
      required: ['room_id'],
    },
  },

  // ---------- Write: tenants ----------
  {
    name: 'create_tenant',
    mode: 'write',
    description: 'สร้างผู้เช่าใหม่พร้อมบัญชีเข้าสู่ระบบ',
    parameters: {
      type: 'object',
      properties: {
        full_name: str('ชื่อ-นามสกุล'),
        phone: str('เบอร์โทร'),
        email: str('อีเมลสำหรับเข้าสู่ระบบ'),
        password: str('รหัสผ่านเริ่มต้น (อย่างน้อย 6 ตัวอักษร)'),
        room_number: str('เลขห้องที่จะเข้าอยู่'),
        move_in_date: str('วันที่เข้าอยู่ (YYYY-MM-DD)'),
      },
      required: ['full_name', 'email', 'password', 'room_number', 'move_in_date'],
    },
  },
  {
    name: 'update_tenant',
    mode: 'write',
    description: 'แก้ไขข้อมูลผู้เช่า (ชื่อ/เบอร์โทร/วันที่เข้าอยู่)',
    parameters: {
      type: 'object',
      properties: {
        tenant_id: str('UUID ของ tenant record'),
        full_name: str('ชื่อใหม่'),
        phone: str('เบอร์โทรใหม่'),
        move_in_date: str('วันที่เข้าอยู่ใหม่ (YYYY-MM-DD)'),
      },
      required: ['tenant_id'],
    },
  },
  {
    name: 'move_out_tenant',
    mode: 'write',
    description: 'ให้ผู้เช่าย้ายออก — ปิดบัญชีเข้าสู่ระบบและตั้งห้องเป็นว่างถ้าไม่มีผู้เช่าคนอื่นเหลือ',
    parameters: {
      type: 'object',
      properties: { tenant_id: str('UUID ของ tenant record') },
      required: ['tenant_id'],
    },
  },
  {
    name: 'reset_tenant_password',
    mode: 'write',
    description: 'ตั้งรหัสผ่านใหม่ให้ผู้เช่า (ทับรหัสเดิม)',
    parameters: {
      type: 'object',
      properties: {
        profile_id: str('UUID ของ profile ผู้เช่า'),
        password: str('รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)'),
      },
      required: ['profile_id', 'password'],
    },
  },

  // ---------- Write: maintenance ----------
  {
    name: 'create_maintenance_request',
    mode: 'write',
    description: 'สร้างรายการแจ้งซ่อมใหม่',
    parameters: {
      type: 'object',
      properties: {
        room_number: str('เลขห้อง'),
        title: str('หัวข้อปัญหา'),
        description: str('รายละเอียดเพิ่มเติม'),
        priority: enumStr('ความเร่งด่วน', ['low', 'medium', 'high']),
      },
      required: ['room_number', 'title'],
    },
  },
  {
    name: 'update_maintenance_status',
    mode: 'write',
    description: 'อัปเดตสถานะ/ความเร่งด่วนของรายการแจ้งซ่อม',
    parameters: {
      type: 'object',
      properties: {
        request_id: str('UUID ของรายการแจ้งซ่อม'),
        status: enumStr('สถานะใหม่', ['open', 'in_progress', 'resolved', 'closed']),
        priority: enumStr('ความเร่งด่วนใหม่', ['low', 'medium', 'high']),
      },
      required: ['request_id'],
    },
  },
  {
    name: 'delete_maintenance_request',
    mode: 'write',
    description: 'ลบรายการแจ้งซ่อม ทำแล้วกู้คืนไม่ได้',
    parameters: {
      type: 'object',
      properties: { request_id: str('UUID ของรายการแจ้งซ่อม') },
      required: ['request_id'],
    },
  },

  // ---------- Write: announcements ----------
  {
    name: 'create_announcement',
    mode: 'write',
    description: 'สร้างประกาศใหม่ — ผู้เช่าทุกคนจะเห็นทันที',
    parameters: {
      type: 'object',
      properties: {
        title: str('หัวข้อประกาศ'),
        body: str('เนื้อหาประกาศ'),
        is_pinned: bool('ปักหมุดไว้บนสุดหรือไม่'),
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'update_announcement',
    mode: 'write',
    description: 'แก้ไขประกาศที่มีอยู่',
    parameters: {
      type: 'object',
      properties: {
        announcement_id: str('UUID ของประกาศ'),
        title: str('หัวข้อใหม่'),
        body: str('เนื้อหาใหม่'),
        is_pinned: bool('ปักหมุดไว้บนสุดหรือไม่'),
      },
      required: ['announcement_id'],
    },
  },
  {
    name: 'delete_announcement',
    mode: 'write',
    description: 'ลบประกาศ ทำแล้วกู้คืนไม่ได้',
    parameters: {
      type: 'object',
      properties: { announcement_id: str('UUID ของประกาศ') },
      required: ['announcement_id'],
    },
  },
  {
    name: 'toggle_pin_announcement',
    mode: 'write',
    description: 'ปักหมุด/ยกเลิกปักหมุดประกาศ',
    parameters: {
      type: 'object',
      properties: {
        announcement_id: str('UUID ของประกาศ'),
        is_pinned: bool('true = ปักหมุด, false = ยกเลิกปักหมุด'),
      },
      required: ['announcement_id', 'is_pinned'],
    },
  },
]

export const toolModeByName: Record<string, ToolMode> = Object.fromEntries(
  agentTools.map(t => [t.name, t.mode])
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toGroqTools(): any[] {
  return agentTools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}
