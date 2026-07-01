export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F5] px-4">
      {children}
    </div>
  )
}
