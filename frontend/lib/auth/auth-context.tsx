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
  getCurrentUser,
  updateCurrentUser,
  login as loginRequest,
  register as registerRequest,
  type RegisterPayload,
  type UpdateProfilePayload,
  type UserProfile,
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
  profile: UserProfile | null
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>
  updateProfileLocally: (payload: Omit<UserProfile, "id">) => void
  login: (username: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Hydrate auth state and profile after mount to avoid SSR mismatches.
  useEffect(() => {
    const token = getAccessToken()
    setIsAuthenticated(Boolean(token))
    setReady(true)

    if (token) {
      setProfileLoading(true)
      getCurrentUser(token)
        .then(setProfile)
        .catch(() => setProfile(null))
        .finally(() => setProfileLoading(false))
    }

    // Keep auth state in sync across tabs.
    const onStorage = () => {
      const nextToken = getAccessToken()
      setIsAuthenticated(Boolean(nextToken))
      if (!nextToken) setProfile(null)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await loginRequest(username, password)
    setTokens(tokens)
    setIsAuthenticated(true)
    setProfileLoading(true)
    try {
      setProfile(await getCurrentUser(tokens.access))
    } catch {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    await registerRequest(payload)
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setIsAuthenticated(false)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setProfile(null)
      return
    }
    setProfileLoading(true)
    try {
      setProfile(await getCurrentUser(token))
    } catch {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload) => {
      const token = getAccessToken()
      if (!token) throw new Error("Not authenticated")
      setProfileLoading(true)
      try {
        const updatedProfile = await updateCurrentUser(token, payload)
        setProfile(updatedProfile)
        return updatedProfile
      } catch (error) {
        console.error("Failed to update profile:", error)
        throw error
      } finally {
        setProfileLoading(false)
      }
    },
    [],
  )

  const updateProfileLocally = useCallback(
    (payload: Omit<UserProfile, "id">) => {
      setProfile((prev) => {
        const next = prev ? { ...prev, ...payload } : null
        if (typeof window !== "undefined" && next) {
          window.localStorage.setItem("user_profile", JSON.stringify(next))
        }
        return next
      })
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      isAuthenticated,
      profile,
      profileLoading,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
      updateProfileLocally,
    }),
    [
      ready,
      isAuthenticated,
      profile,
      profileLoading,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
      updateProfileLocally,
    ],
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
