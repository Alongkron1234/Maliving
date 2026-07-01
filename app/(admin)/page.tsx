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
    <div className="flex-1 flex flex-col bg-[#fff8f5]">
      {/* Header */}
      <header className="border-b border-[#ddc1ae] bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-[#904d00]">Maliving</span>
          <Link
            href="/login"
            className="bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[420px] sm:h-[540px] w-full overflow-hidden">
        <Image
          src="/images/dormitory-hero.webp"
          alt="อาคารหอพัก Maliving"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
        <div className="absolute inset-0 flex flex-col items-center justify-end text-center px-6 pb-14 sm:pb-20">
          <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">Maliving</h1>
          <p className="text-white/90 mt-3 max-w-xl text-sm sm:text-base">
            ระบบจัดการหอพักออนไลน์ครบวงจร — ห้องพัก ผู้เช่า มิเตอร์น้ำ/ไฟ บิล และแจ้งซ่อม ในที่เดียว
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 w-full">
        <h2 className="text-2xl font-bold text-[#241912] text-center mb-2">ทุกอย่างที่หอพักต้องการ ในระบบเดียว</h2>
        <p className="text-sm text-[#897362] text-center mb-10">ตั้งแต่จัดการห้องไปจนถึงแจ้งเตือนผู้เช่าผ่าน Line</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-[#ddc1ae] p-6 shadow-[0_0_15px_rgba(144,77,0,0.06)]"
            >
              <div className="w-11 h-11 rounded-xl bg-[#fff1e9] flex items-center justify-center mb-4">
                <f.icon size={20} className="text-[#904d00]" />
              </div>
              <h3 className="text-sm font-bold text-[#241912] mb-1">{f.title}</h3>
              <p className="text-sm text-[#897362]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ddc1ae] bg-white py-6 mt-auto">
        <p className="text-center text-xs text-[#897362]">© {new Date().getFullYear()} Maliving. All rights reserved.</p>
      </footer>
    </div>
  )
}
