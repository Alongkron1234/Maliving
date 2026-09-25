-- =============================================================
-- Maliving — Migration 002
-- รัน SQL นี้ใน Supabase SQL Editor (ยังไม่มี migration runner อัตโนมัติ
-- ในโปรเจกต์นี้ — ดู supabase/schema.sql สำหรับ schema เดิม)
--
-- เพิ่ม profiles.line_connected_at → เวลาที่ผูก Line OA สำเร็จครั้งล่าสุด
-- set โดย /api/line/webhook ทุกครั้งที่ทายเบอร์โทรตรงกับผู้เช่าคนเดียว
-- (ใช้แสดงสถานะ "เชื่อมต่อ Line Bot แล้ว" จริงในหน้าผู้เช่า แทนของปลอม)
-- nullable, ไม่กระทบแถวเดิมที่มีอยู่แล้ว
-- =============================================================

alter table profiles
  add column line_connected_at timestamptz;
