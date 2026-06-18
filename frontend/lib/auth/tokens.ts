/**
 * Single source of truth for auth token storage.
 *
 * Centralizing the storage keys here fixes the previous bug where different
 * components read/wrote inconsistent keys ("token" vs "access_token").
 */
export const ACCESS_TOKEN_KEY = "access_token"
export const REFRESH_TOKEN_KEY = "refresh_token"

const isBrowser = () => typeof window !== "undefined"

function readKey(key: string): string | null {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(key)
  return raw && raw !== "undefined" && raw !== "null" ? raw : null
}

export function getAccessToken(): string | null {
  return readKey(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return readKey(REFRESH_TOKEN_KEY)
}

export function setTokens(tokens: { access: string; refresh?: string }): void {
  if (!isBrowser()) return
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
  if (tokens.refresh) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
  }
}

export function clearTokens(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}
