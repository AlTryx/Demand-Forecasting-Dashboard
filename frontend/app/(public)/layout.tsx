import type { ReactNode } from "react"
import { Navbar } from "@/components/marketing/navbar"

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-clip bg-background">
      <Navbar />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
