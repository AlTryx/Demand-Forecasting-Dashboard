"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, type FormEvent } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth/auth-context"
import { ApiError } from "@/lib/api/client"
import { AuthDivider, GoogleButton } from "./google-button"

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      await login(username, password)
      router.push("/dashboard")
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError("Could not reach the server. Please try again.")
      } else {
        setError("Invalid username or password")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="mx-auto mt-10 w-full max-w-[360px] rounded-2xl border border-border/60 bg-card/80 p-8 shadow-xl backdrop-blur-md"
    >
      <h2 className="text-2xl font-bold text-foreground">Welcome back!</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign in to access your forecasting dashboard.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      <div className="mt-6">
        <GoogleButton label="Sign in" />
      </div>
      <AuthDivider />

      <div className="mt-4">
        <label
          htmlFor="username"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor="password"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "Logging in..." : "Sign In"}
      </button>

      <p className="mt-3 text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Sign up today!
        </Link>
      </p>
    </motion.form>
  )
}
