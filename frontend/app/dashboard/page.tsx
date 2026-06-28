import { Dashboard } from "@/components/dashboard/dashboard"
import { RequireAuth, RequireBusiness } from "@/components/auth/route-guard"

export default function DashboardPage() {
  return (
    <RequireAuth>
      <RequireBusiness>
        <Dashboard />
      </RequireBusiness>
    </RequireAuth>
  )
}
