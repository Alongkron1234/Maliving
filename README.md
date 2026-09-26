# Maliving

ระบบจัดการหอพักออนไลน์ **Maliving** (Malee + Living) — ให้ admin จัดการห้อง ผู้เช่า มิเตอร์น้ำ/ไฟ บิล และแจ้งซ่อมได้ในที่เดียว พร้อม Line OA Bot ให้ผู้เช่าเช็คยอดบิลได้ทันที

## ฟีเจอร์หลัก

**ฝั่ง Admin**
- แดชบอร์ด: ภาพรวมการเงิน, อัตราการเข้าพัก, ผังห้องพัก, แนวโน้มรายรับย้อนหลัง
- จัดการห้องพัก, ผู้เช่า (ตั้ง/รีเซ็ตรหัสผ่านได้), มิเตอร์น้ำ/ไฟ, บิล, การชำระเงิน, แจ้งซ่อม, ประกาศ
- จดมิเตอร์แบบ manual หรืออัปโหลดรูปให้ AI (Groq Vision) อ่านค่าให้อัตโนมัติ (ตรวจสอบ/แก้ไขก่อนยืนยันเสมอ)
- **ผู้ช่วย AI** (`/admin/agent`) — คุยเป็นภาษาไทยธรรมชาติแล้วให้ AI เรียกใช้ฟังก์ชันของระบบแทนการกดปุ่มเอง มีโหมดทดลอง (sandbox) ให้ลองคำสั่งโดยไม่กระทบข้อมูลจริง
- ตรวจสอบสลิปการโอนเงินที่ผู้เช่าส่งมา (อนุมัติ/ปฏิเสธ)

**ฝั่งผู้เช่า**
- ดูบิล พร้อมพิมพ์/ดาวน์โหลดใบเสร็จ
- **ชำระเงินผ่าน QR PromptPay** แล้วแนบสลิปแจ้งชำระ (รอ admin ตรวจสอบยืนยัน)
- แจ้งซ่อม, ดูประกาศ, แก้ไขโปรไฟล์ตัวเอง

**Line OA Bot**
- ผู้เช่าพิมพ์เบอร์โทรใน Line เพื่อเช็คยอดบิลค้างชำระทั้งหมดได้ทันที (ไม่ต้อง login)

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS 4
- **Database / Auth / Storage**: Supabase (PostgreSQL, RLS ทุกตาราง)
- **OCR**: Groq Vision API (`meta-llama/llama-4-scout-17b-16e-instruct`) — อ่านค่ามิเตอร์จากรูป
- **AI Agent**: Groq (`openai/gpt-oss-120b`) — function calling เรียกใช้ backend เดิม
- **Line Bot**: Line Messaging API ผ่าน Next.js API route
- **Payment QR**: `promptpay-qr` + `qrcode` — generate QR PromptPay ฝั่งเซิร์ฟเวอร์
- **Deploy**: Vercel (auto-deploy จาก `main`)

ไม่มี backend แยก — ทุกอย่างรันผ่าน Next.js API routes และ Supabase โดยตรง

## เริ่มต้นใช้งาน (Local Development)

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` แล้วใส่ค่าดังนี้:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
PROMPTPAY_ID=          # เบอร์โทร/เลขผู้เสียภาษีที่ผูก PromptPay ของหอพัก
```

### 3. ตั้งค่า Supabase

รันไฟล์ SQL ต่อไปนี้ใน **Supabase SQL Editor** ตามลำดับ:

1. `supabase/schema.sql` — สร้าง 9 ตารางหลัก + RLS policies
2. `supabase/seed-admin.sql` — สร้างบัญชี admin คนแรก
3. `supabase/migration_002_line_connected_at.sql`
4. `supabase/migration_003_payment_slips.sql` — คอลัมน์สถานะการชำระเงิน + storage bucket สำหรับสลิป

นอกจากนี้ต้องสร้าง Storage bucket **`meter-images`** (private) ด้วยตัวเองใน Supabase Dashboard สำหรับรูปมิเตอร์ที่ใช้ OCR

### 4. รัน dev server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## โครงสร้างโปรเจกต์ (คร่าวๆ)

```
app/
  (admin)/          — หน้า landing page สาธารณะ
  (auth)/login/     — หน้าเข้าสู่ระบบ
  admin/            — หน้าทั้งหมดฝั่ง admin (ห้อง, ผู้เช่า, มิเตอร์, บิล, ชำระเงิน, แจ้งซ่อม, ประกาศ, ผู้ช่วย AI)
  tenant/           — หน้าทั้งหมดฝั่งผู้เช่า
  api/              — API routes (admin, tenant, Line webhook)
lib/
  agent/            — AI agent: tool registry, executors, loop
  supabase/         — Supabase client helpers + auth guards (requireAdmin, requireTenant)
  promptpay.ts       — สร้าง QR PromptPay
  bills.ts           — ตรรกะสถานะบิล (unpaid/paid/overdue)
supabase/            — schema, migrations, seed script
```

## Roles & Access

- **admin** — จัดการทุกอย่างในระบบ
- **tenant** — ดูบิล/แจ้งซ่อม/ประกาศ/โปรไฟล์ตัวเอง, แจ้งชำระเงินผ่านสลิป (admin เป็นคนยืนยันสุดท้าย)

ไม่มีระบบสมัครสมาชิกเอง — **admin เป็นคนสร้างบัญชีผู้เช่าให้เท่านั้น** ผ่านหน้า "เพิ่มผู้เช่า"

Role คุมด้วย `app_metadata.role` (Supabase Auth) + RLS ทุกตาราง, ป้องกัน route ด้วย `proxy.ts`

## Deploy

Push ขึ้น `main` แล้ว Vercel จะ auto-deploy ให้ (เชื่อมกับ GitHub repo ไว้แล้ว) — อย่าลืมตั้งค่า Environment Variables ชุดเดียวกันไว้ใน Vercel Project Settings ด้วย
