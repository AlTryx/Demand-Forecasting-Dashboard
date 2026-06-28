export type UserRole = "owner" | "manager" | "employee"

export type BusinessMe = {
  id: number
  name: string
  created_at: string
  current_user_role: UserRole
  owner_name: string | null
}

export type BusinessSummary = {
  id: number
  name: string
  role: UserRole
  is_active: boolean
  created_at: string
}
