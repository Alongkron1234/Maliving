import Image from 'next/image'
import Link from 'next/link'
import { BedDouble, Zap, Wrench, MessageCircle, Receipt, Users } from 'lucide-react'

const features = [
  { icon: BedDouble, title: 'จัดการห้องพัก', desc: 'ดูสถานะห้องว่าง/ไม่ว่างแบบเรียลไทม์ จัดการผู้เช่าได้ในที่เดียว' },
  { icon: Zap, title: 'มิเตอร์น้ำ/ไฟอัตโนมัติ', desc: 'ถ่ายรูปมิเตอร์แล้วให้ AI อ่านค่าให้ ลดเวลาคีย์มือ' },
  { icon: Receipt, title: 'ออกบิล & ติดตามการชำระ', desc: 'คำนวณบิลอัตโนมัติ พร้อมพิมพ์หรือดาวน์โหลดใบเสร็จ' },
  { icon: Wrench, title: 'แจ้งซ่อมออนไลน์', desc: 'ผู้เช่าแจ้งปัญหาได้ทันที ติดตามสถานะได้แบบเรียลไทม์' },
  { icon: Users, title: 'พอร์ทัลผู้เช่า', desc: 'ผู้เช่าดูบิล ประกาศ และแจ้งซ่อมได้ด้วยตัวเอง' },
  { icon: MessageCircle, title: 'เช็คยอดผ่าน Line', desc: 'พิมพ์เบอร์โทรใน Line OA เพื่อเช็คยอดค้างชำระได้ทันที' },
]

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#FFFAF7]">
      {/* Header */}
      <header className="border-b border-black/5 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-[#C2410C]">Maliving</span>
          <Link
            href="/login"
            className="bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[calc(100vh-64px)] min-h-[520px] w-full overflow-hidden">
        <Image
          src="/images/dormitory-hero.webp"
          alt="อาคารหอพัก Maliving"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

        {/* Soft floating orbs — purely decorative, sit above the dim overlay */}
        <div className="absolute top-24 left-[8%] w-24 h-24 rounded-full bg-[#FF6A00]/25 blur-2xl animate-float-slow" />
        <div className="absolute bottom-32 right-[10%] w-32 h-32 rounded-full bg-white/20 blur-2xl animate-float-slower" />

        <div className="absolute inset-0 flex flex-col items-center justify-end text-center px-6 pb-14 sm:pb-20">
          <h1 className="animate-fade-in-up text-4xl sm:text-6xl font-bold text-white tracking-tight">Maliving</h1>
          <p
            className="animate-fade-in-up text-white/90 mt-3 max-w-xl text-sm sm:text-base"
            style={{ animationDelay: '120ms' }}
          >
            ระบบจัดการหอพักออนไลน์ครบวงจร — ห้องพัก ผู้เช่า มิเตอร์น้ำ/ไฟ บิล และแจ้งซ่อม ในที่เดียว
          </p>
          <Link
            href="/login"
            className="animate-fade-in-up mt-6 inline-flex bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-6 py-3 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-1 hover:scale-105"
            style={{ animationDelay: '240ms' }}
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 w-full">
        <h2 className="text-2xl font-bold text-[#18181B] text-center mb-2">ทุกอย่างที่หอพักต้องการ ในระบบเดียว</h2>
        <p className="text-sm text-[#71717A] text-center mb-10">ตั้งแต่จัดการห้องไปจนถึงแจ้งเตือนผู้เช่าผ่าน Line</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group animate-fade-in-up bg-white rounded-2xl border border-black/5 p-6 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] hover:shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] hover:-translate-y-1 transition-all"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-[#FFE8D1] flex items-center justify-center mb-4 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <f.icon size={20} className="text-[#C2410C]" />
              </div>
              <h3 className="text-sm font-bold text-[#18181B] mb-1">{f.title}</h3>
              <p className="text-sm text-[#71717A]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 bg-white py-6 mt-auto">
        <p className="text-center text-xs text-[#71717A]">© {new Date().getFullYear()} Maliving. All rights reserved.</p>
      </footer>
    </div>
  )
}
