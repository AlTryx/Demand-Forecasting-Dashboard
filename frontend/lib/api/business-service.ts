import { apiFetch } from "@/lib/api/client"
import type { BusinessMe, BusinessSummary } from "@/lib/types/business"

export function getMyBusiness(token: string) {
  return apiFetch<BusinessMe>("/api/businesses/me/", { token })
}

export function listBusinesses(token: string) {
  return apiFetch<BusinessSummary[]>("/api/businesses/", { token })
}

export function createBusiness(name: string, token: string) {
  return apiFetch<BusinessSummary>("/api/businesses/", {
    method: "POST",
    body: { name },
    token,
  })
}

export function activateBusiness(businessId: number, token: string) {
  return apiFetch<BusinessSummary>(`/api/businesses/${businessId}/activate/`, {
    method: "POST",
    token,
  })
}
