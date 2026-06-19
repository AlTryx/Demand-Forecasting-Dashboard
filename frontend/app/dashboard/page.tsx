import { Dashboard } from "@/components/dashboard/dashboard"
import { RequireAuth } from "@/components/auth/route-guard"

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  )
}
