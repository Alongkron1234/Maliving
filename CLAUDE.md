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

- Webhook endpoint: `/api/line/webhook` (`app/api/line/webhook/route.ts`) — **โค้ดเขียนเสร็จแล้ว** แต่ยังเชื่อม/ทดสอบกับ Line จริงไม่ได้จนกว่าจะ Deploy (Phase 8) เพราะ Line ต้องการ HTTPS public URL
- ผู้เช่าพิมพ์ **เบอร์โทร** ใน Line (ไม่ใช้ชื่อ — ชื่อซ้ำกันได้ เบอร์โทรแม่นยำกว่า) → bot normalize เบอร์ทั้งสองฝั่งก่อนเทียบ (ตัด `-`, เว้นวรรค, แปลง `+66`/`66` นำหน้าเป็น `0`)
- เทียบกับ `profiles.phone` (เฉพาะ role = tenant) — เจอ 0 คนหรือมากกว่า 1 คน (เบอร์ซ้ำ) จะไม่เดา ตอบให้ติดต่อ admin โดยตรงแทน
- เจอตรง 1 คน → หา active tenant record → ตอบ **ยอดค้างชำระรวมของทุกบิลที่ยังไม่จ่าย** (ไม่ใช่แค่บิลล่าสุด) พร้อม flag บิลที่เกินกำหนด
- ต้อง verify `X-Line-Signature` ทุก request (HMAC-SHA256 ด้วย `LINE_CHANNEL_SECRET`) ก่อนเชื่อถือ body เสมอ

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
| **8** | Deploy | ❌ ยังไม่ทำ — เชื่อม Vercel + push + ตั้งค่า env vars + Supabase Auth redirect URL |
| **9** | Line OA Bot | โค้ด webhook เสร็จแล้ว (`app/api/line/webhook/route.ts`) ✅ — รอ Deploy (8) ก่อนถึงจะตั้ง Webhook URL ใน Line Console และทดสอบจริงได้ |

**หมายเหตุ:**
- Phase 0 ยังไม่ต้องสร้าง Line OA หรือเชื่อม Vercel — ทำใน Phase 8–9 หลัง feature เสร็จแล้ว
- Line OA Bot (Phase 9) เขียนโค้ดไว้ก่อนได้ แต่ทดสอบ/เชื่อมจริงกับ Line ต้องรอ Deploy (Phase 8) เสมอ เพราะ Line Webhook ต้องการ HTTPS public URL
- **สิ่งที่เหลือทั้งหมดตอนนี้คือ Phase 8 (Deploy)** — ทำเสร็จแล้วจะ unblock การทดสอบ Line OA Bot ได้ทันที
