"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  login as loginRequest,
  register as registerRequest,
  type RegisterPayload,
} from "@/lib/auth/auth-service"
import {
  clearTokens,
  getAccessToken,
  setTokens,
} from "@/lib/auth/tokens"

type AuthContextValue = {
  /** True once we have read the initial token state on the client. */
  ready: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Hydrate auth state from storage after mount to avoid SSR mismatches.
  useEffect(() => {
    setIsAuthenticated(Boolean(getAccessToken()))
    setReady(true)

    // Keep auth state in sync across tabs.
    const onStorage = () => setIsAuthenticated(Boolean(getAccessToken()))
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await loginRequest(username, password)
    setTokens(tokens)
    setIsAuthenticated(true)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    await registerRequest(payload)
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setIsAuthenticated(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ready, isAuthenticated, login, register, logout }),
    [ready, isAuthenticated, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
