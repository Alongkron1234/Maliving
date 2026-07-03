import AgentChat from './AgentChat'

export default function AgentPage() {
  return (
    <div className="p-8 flex flex-col h-[calc(100vh-56px)] lg:h-screen">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-[#241912]">ผู้ช่วย AI</h1>
        <p className="text-sm text-[#897362] mt-1">
          สั่งงานด้วยข้อความภาษาไทยได้เลย เช่น &quot;ห้องไหนค้างจ่ายบ้าง&quot; หรือ &quot;ออกบิลห้อง 3 เดือนนี้&quot; —
          action ที่มีผลจริงจะขอให้ยืนยันก่อนทุกครั้ง
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <AgentChat />
      </div>
    </div>
  )
}
