import { apiFetch } from "@/lib/api/client"

/** Shape of the token endpoint response from the Django backend. */
export type TokenResponse = {
  access: string
  refresh?: string
}

export type RegisterPayload = {
  username: string
  firstName: string
  lastName: string
  email: string
  password: string
}

export type UserProfile = {
  id: number
  email: string
  first_name: string
  last_name: string
  currency: "EUR" | "USD"
  horizon_days: 7 | 14 | 30
  stockout_alerts: boolean
  weekly_digest: boolean
  live_stream: boolean
}

export type UpdateProfilePayload = {
  first_name?: string
  last_name?: string
  email?: string
  currency?: "EUR" | "USD"
  horizon_days?: 7 | 14 | 30
  stockout_alerts?: boolean
  weekly_digest?: boolean
  live_stream?: boolean
}

/** POST /api/token/ — exchange credentials for JWT tokens. */
export function login(username: string, password: string) {
  return apiFetch<TokenResponse>("/api/token/", {
    method: "POST",
    body: { username, password },
  })
}

/** POST /api/token/refresh/ — exchange a refresh token for a new access token. */
export function refreshAccessToken(refresh: string) {
  return apiFetch<TokenResponse>("/api/token/refresh/", {
    method: "POST",
    body: { refresh },
  })
}

/** GET /api/user/me/ — return the current signed-in user profile. */
export function getCurrentUser(token: string) {
  return apiFetch<UserProfile>("/api/user/me/", { token })
}

/** POST /api/user/registration/ — create a new account. */
export function register(payload: RegisterPayload) {
  return apiFetch("/api/user/registration/", {
    method: "POST",
    body: {
      username: payload.username,
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      password: payload.password,
    },
  })
}

/**
 * API contract for a future profile update endpoint.
 * Keep the payload snake_case to match Django ModelSerializer fields.
 */
export function updateCurrentUser(token: string, payload: UpdateProfilePayload) {
  return apiFetch<UserProfile>("/api/user/me/", {
    method: "PATCH",
    token,
    body: payload,
  })
}
