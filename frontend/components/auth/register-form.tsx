"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, type FormEvent } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth/auth-context"
import { ApiError } from "@/lib/api/client"
import { AuthDivider, GoogleButton } from "./google-button"

const FIELDS = [
  { id: "username", label: "Username", type: "text", autoComplete: "username" },
  { id: "firstName", label: "First Name", type: "text", autoComplete: "given-name" },
  { id: "lastName", label: "Last Name", type: "text", autoComplete: "family-name" },
  { id: "email", label: "Email", type: "email", autoComplete: "email" },
  { id: "password", label: "Password", type: "password", autoComplete: "new-password" },
] as const

type FieldId = (typeof FIELDS)[number]["id"]

export function RegisterForm() {
  const router = useRouter()
  const { register } = useAuth()
  const [values, setValues] = useState<Record<FieldId, string>>({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      await register(values)
      router.push("/signin")
    } catch (err) {
      const message =
        err instanceof ApiError ? extractFieldErrors(err.data) : null
      setError(message ?? "Could not create your account. Please try again.")
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
      className="mx-auto mt-10 mb-12 w-full max-w-[360px] rounded-2xl border border-border/60 bg-card/80 p-8 shadow-xl backdrop-blur-md"
    >
      <h2 className="text-2xl font-bold text-foreground">Sign up today!</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create an account to start forecasting demand.
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
        <GoogleButton label="Sign up" />
      </div>
      <AuthDivider />

      {FIELDS.map((field) => (
        <div key={field.id} className="mt-4">
          <label
            htmlFor={field.id}
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            {field.label}
          </label>
          <input
            id={field.id}
            type={field.type}
            autoComplete={field.autoComplete}
            placeholder={field.type === "password" ? "••••••••" : undefined}
            value={values[field.id]}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
            }
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "Signing up..." : "Sign Up"}
      </button>

      <p className="mt-3 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </motion.form>
  )
}

/** Turn a Django field-error object into a readable message. */
function extractFieldErrors(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null
  const messages: string[] = []
  for (const [field, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      messages.push(`${field}: ${value.join(" ")}`)
    } else if (typeof value === "string") {
      messages.push(`${field}: ${value}`)
    }
  }
  return messages.length > 0 ? messages.join(" ") : null
}
