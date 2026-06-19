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
  username: string
  firstName?: string
  lastName?: string
  email?: string
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
