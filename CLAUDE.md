@AGENTS.md

# Maliving

ระบบจัดการหอพักออนไลน์ชื่อ **Maliving** (Malee + Living)
สำหรับ admin จัดการห้อง ผู้เช่า มิเตอร์น้ำ/ไฟ บิล แจ้งซ่อม และมี Line OA Bot ให้ผู้เช่าเช็คยอดบิลได้

---

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage — ใช้จริงแค่ bucket `meter-images` (รูปมิเตอร์สำหรับ OCR) ไม่มี upload สลิปหรือรูปแจ้งซ่อม (ตัดออกจากแผนเดิม)
- **OCR**: Groq Vision API (Llama 4 Scout)
- **Line Bot**: Line Messaging API (Webhook ผ่าน Next.js API route)
- **Deploy**: Vercel

ไม่มี backend server แยก — ทุกอย่างรันผ่าน Next.js API routes และ Supabase

---

## Database Schema (9 ตาราง)

```
profiles           — ผู้ใช้ทุกคน (admin + tenant) ต่อจาก auth.users
rooms              — ข้อมูลห้องพัก
tenants            — ความสัมพันธ์ผู้เช่า ↔ ห้อง
ocr_batches        — รูปมิเตอร์ที่ upload + ผลดิบจาก Groq
meter_readings     — เลขมิเตอร์น้ำ/ไฟ (manual หรือ ocr)
bills              — บิลรายเดือน
payments           — บันทึกการชำระเงิน
maintenance_requests — แจ้งซ่อมอุปกรณ์
announcements      — ประกาศจาก admin
```

**หมายเหตุสำคัญ:**
- `rent_price`, ค่าน้ำ/ไฟ, ยอดบิล, จำนวนเงินทุกจุด — เป็น `integer` (บาท ไม่มีทศนิยม)
- เลขมิเตอร์ (`previous_reading`, `current_reading`) — เป็น `integer`
- `units_used` และ `total_amount` — เป็น generated column คำนวณอัตโนมัติ
- ห้องเดียวมีผู้เช่าได้หลายคน (ไม่มี unique constraint ต่อห้อง)

---

## Roles

- `admin` — จัดการทุกอย่าง: ห้อง, ผู้เช่า, มิเตอร์, บิล, ชำระเงิน, แจ้งซ่อม, ประกาศ
- `tenant` — ดูบิลตัวเอง (พิมพ์/ดาวน์โหลดใบเสร็จได้), แจ้งซ่อม, ดูประกาศ, แก้ไขโปรไฟล์ตัวเอง — **ไม่มี upload สลิปเอง** (ตัดออกจากแผนเดิม การบันทึกชำระเงินทำโดย admin เท่านั้น)

Role เก็บใน `profiles.role` (+ `app_metadata.role` ฝั่ง auth) และคุมด้วย Supabase RLS ทุกตาราง

---

## OCR Flow (Groq Vision)

1. Admin upload รูปกระดาษจดมิเตอร์ → Supabase Storage
2. บันทึกลง `ocr_batches` (status = `'pending'`, เก็บ `reading_month`/`reading_year` ของรอบนั้นด้วย)
3. ส่งรูปให้ Groq Vision API (model `meta-llama/llama-4-scout-17b-16e-instruct`)
4. Groq return JSON:
```json
{
  "readings": [
    { "room": "101", "electric": 1234, "water": 56 },
    { "room": "102", "electric": 2100, "water": 78 }
  ]
}
```
5. resolve `room_number` → `room_id` ทันที แล้วเก็บเป็น **draft** ใน `ocr_batches.raw_result` (status = `'done'`) — **ยังไม่ insert ลง `meter_readings`**
6. Admin เปิดห้องแต่ละห้องที่หน้า Meters → ค่าที่ AI อ่านได้จะขึ้นมา prefill ให้ตรวจสอบ/แก้ไขก่อน แล้วต้องกด **"Save Reading"** เพื่อยืนยัน ถึงจะ insert ลง `meter_readings` จริง (`input_method = 'ocr'`, ผูก `ocr_batch_id`)
7. Bill จะออกได้เฉพาะห้องที่มี `meter_readings` ยืนยันแล้วครบทั้งไฟและน้ำของเดือนนั้น (ดู Phase 5.5 Bills) — OCR ที่ยังไม่กด Save Reading จะไม่ถูกนำไปออกบิลเด็ดขาด

หรือ admin กรอกเลขมิเตอร์ทีละห้องแบบ manual ได้เช่นกัน (`input_method = 'manual'`, `ocr_batch_id = null`) — ฟอร์มเดียวกันใช้ทั้ง manual และยืนยัน OCR draft

---

## Line OA Bot Flow

- Webhook endpoint: `/api/line/webhook` (`app/api/line/webhook/route.ts`) — **เชื่อมกับ Line จริงแล้ว** (deploy บน Vercel ให้ HTTPS public URL ตามที่ Line ต้องการ), verify ผ่านและทดสอบพิมพ์เบอร์โทรจริงแล้วได้ยอดบิลค้างชำระถูกต้อง
- ผู้เช่าพิมพ์ **เบอร์โทร** ใน Line (ไม่ใช้ชื่อ — ชื่อซ้ำกันได้ เบอร์โทรแม่นยำกว่า) → bot normalize เบอร์ทั้งสองฝั่งก่อนเทียบ (ตัด `-`, เว้นวรรค, แปลง `+66`/`66` นำหน้าเป็น `0`)
- เทียบกับ `profiles.phone` (เฉพาะ role = tenant) — เจอ 0 คนหรือมากกว่า 1 คน (เบอร์ซ้ำ) จะไม่เดา ตอบให้ติดต่อ admin โดยตรงแทน
- เจอตรง 1 คน → หา active tenant record → ตอบ **ยอดค้างชำระรวมของทุกบิลที่ยังไม่จ่าย** (ไม่ใช่แค่บิลล่าสุด) พร้อม flag บิลที่เกินกำหนด
- ต้อง verify `X-Line-Signature` ทุก request (HMAC-SHA256 ด้วย `LINE_CHANNEL_SECRET`) ก่อนเชื่อถือ body เสมอ

---

## AI Agent (function calling) — `/admin/agent`

หน้าแชท AI สำหรับ admin คุยเป็นภาษาไทยธรรมชาติ แล้วให้ agent เรียกใช้ backend function ที่มีอยู่แล้วของระบบแทนการกดปุ่มเอง (ไม่ใช่ browser automation)

- **สมอง**: Groq (`llama-3.3-70b-versatile` — คนละ model กับ OCR vision ที่ใช้ `llama-4-scout`)
- **Tool registry**: `lib/agent/tools.ts` — schema ของทุก tool + `mode: 'read' | 'write'`
- **Executors**: `lib/agent/executors/*.ts` แยกตาม domain (rooms, tenants, meters, bills, payments, maintenance, announcements, dashboard) — tool ที่มี API route อยู่แล้วจะเรียกผ่าน internal `fetch()` ไปที่ route เดิม (ไม่เขียน logic ซ้ำ), ส่วน tool ที่เดิมมีแค่ direct-Supabase CRUD ในฟอร์ม (rooms/tenant profile/maintenance/announcements) executor จะใช้ `createClient()` (RLS ปกติ) เหมือนที่ฟอร์มเดิมทำ
- **Agent loop**: `lib/agent/loop.ts` — เรียก Groq วนอัตโนมัติ, execute tool ที่เป็น `read` ทันทีแล้ววนต่อ, พอเจอ tool ที่เป็น `write` จะ**หยุดทั้ง batch รอ user confirm ก่อนเสมอ** (กฎตายตัว ไม่ใช่แค่ prompt บอก AI ให้ระวัง)
- **Route**: `POST /api/admin/agent/chat` (เริ่ม/ต่อบทสนทนา) และ `POST /api/admin/agent/confirm` (ส่ง decision ของแต่ละ pending tool call พร้อม args ที่แก้ไขได้ก่อน confirm) — ทั้งสอง route เช็ค `role === 'admin'` เองตรงๆ เพราะ `proxy.ts` เช็คแค่ path ที่ขึ้นต้นด้วย `/admin` ไม่ครอบคลุม `/api/admin/*`
- **การยกเลิก (cancel)**: ถ้า user กด "ยกเลิกทั้งหมด" ระบบจะ**หยุดแบบเด็ดขาดในโค้ดเลย ไม่ส่งกลับไปให้ AI ตัดสินใจต่อ** — กัน AI เผลอเรียก tool เดิมซ้ำทันทีหลังโดนปฏิเสธ
- **OCR ผ่าน agent**: แนบรูปในแชท → upload ผ่าน `/api/admin/agent/upload` ก่อน → เรียก `run_meter_ocr` (auto, ไม่ต้อง confirm เพราะยังเป็นแค่ draft) → ผลลัพธ์ให้ user ตรวจ/แก้ก่อน confirm `save_meter_reading` ทีละห้อง → confirm `generate_bill` ต่อ
- **ข้อจำกัดที่รู้อยู่แล้ว**: ทุก request ต้องแนบ schema ของ tools ทั้งหมด (~5,300 token/ครั้ง) ทำให้ Groq free tier (100,000 token/วัน) หมดเร็วถ้าทดสอบถี่ๆ — ใช้งานจริงเดือนละ 1-2 ครั้งไม่มีปัญหา

---

## กฎการเขียนโค้ด

- ใช้ **TypeScript** เสมอ
- **`proxy.ts`** (ไม่ใช่ `middleware.ts`) — `middleware` ถูก deprecated ใน Next.js version นี้ แล้ว
- ใช้ `getUser()` ไม่ใช่ `getSession()` ใน proxy เสมอ (validate JWT กับ Supabase server)
- Role ของ user เก็บใน `app_metadata.role` (ตั้งตอนสร้าง user ด้วย `supabase.auth.admin.createUser`)
- ดึงข้อมูลใน **Server Component** ก่อนเสมอ ถ้าไม่จำเป็นต้อง client อย่าใช้ `use client`
- ห้าม hardcode API key หรือ secret ทุกกรณี ใช้ environment variables เท่านั้น
- UI ดูไฟล์ `DESIGN.md` (design system: สี, typography, spacing, components) และ `dormiflow_design_document.md` (screen breakdown) เป็น reference หลัก
- สีหลัก: Primary Orange `#FF8C00`, Surface `#FFF8F5`, Text `#333333`
- Font: **Inter** ทุก element
- Corner radius: inputs/buttons = 8px, cards/modals = 16px
- Navigation: Left sidebar (admin), Top nav (tenant)

---

## Environment Variables ที่ต้องใช้

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

---

## Build Workflow (ลำดับการพัฒนา)

| Phase | งาน | รายละเอียด |
|-------|-----|-----------|
| **0** | External Services | สร้าง Supabase project + Groq API Key เท่านั้น ✅ |
| **1** | Local Setup | `npm install` packages + สร้าง `.env.local` ✅ |
| **2** | Database Schema | สร้าง 9 ตาราง + RLS policies + Storage buckets ใน Supabase ✅ |
| **3** | File Structure | `lib/supabase/` clients + `lib/types/` TypeScript types ✅ | 
| **4** | Authentication | Login page + `proxy.ts` ป้องกัน route ตาม role ✅ |
| **5** | Admin Features | ✅ ครบทั้งหมด — 5.1 Layout+Dashboard (มี stat การเงิน/operations, ไม่มี Quick Actions), 5.2 Rooms, 5.3 Tenants (+ ตั้ง/reset รหัสผ่าน, แสดง email), 5.4 Meters (Manual + OCR แบบ draft/confirm), 5.5 Bills (+ พิมพ์/ดาวน์โหลดใบเสร็จ), 5.6 Payments, 5.7 Maintenance, 5.8 Announcements |
| **6** | Tenant Features | ✅ Dashboard, ดูบิล (+ พิมพ์/ดาวน์โหลดใบเสร็จ), แจ้งซ่อม, ดูประกาศ, แก้ไขโปรไฟล์ตัวเอง — **ตัด upload สลิปออกจากแผนเดิม** |
| **7** | Components | ข้าม — ไม่มี `components/ui/`/`components/forms/` แยก ใช้วิธี duplicate component เล็กๆ ต่อหน้าแทน (ตามแบบที่ codebase ทำมาตลอด) |
| **8** | Deploy | ✅ Deploy ขึ้น Vercel แล้ว เชื่อมกับ GitHub repo `Alongkron1234/Maliving` — push ขึ้น `main` = auto-deploy |
| **9** | Line OA Bot | ✅ webhook เชื่อมจริงแล้ว (`app/api/line/webhook/route.ts`), verify ผ่าน, ทดสอบพิมพ์เบอร์โทรแล้วได้ยอดบิลค้างชำระถูกต้อง |
| **10** | AI Agent | ✅ หน้าแชท `/admin/agent` (function calling ผ่าน Groq) — ดูรายละเอียดหัวข้อ "AI Agent" ด้านบน |

**หมายเหตุ:**
- ทุก Phase ทำเสร็จแล้ว — งานที่เหลือต่อจากนี้เป็น feature เพิ่มเติม/แก้บั๊ก/ปรับปรุงบนฐานที่ deploy จริงแล้ว ไม่ใช่การ build เริ่มต้นอีกต่อไป
