"use client"

import { useState } from "react"

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

type GoogleButtonProps = {
  /** "Sign in" / "Sign up" — controls the label wording. */
  label: string
}

/**
 * OAuth/OIDC entry point for Google. The provider handshake isn't wired up
 * yet, so this surfaces a friendly placeholder. When OIDC 2.0 is added,
 * replace `handleClick` with a redirect to the authorization endpoint.
 */
export function GoogleButton({ label }: GoogleButtonProps) {
  const [notice, setNotice] = useState(false)

  const handleClick = () => {
    // TODO: replace with `window.location.href = "/api/auth/google"` once
    // the OIDC 2.0 flow is implemented.
    setNotice(true)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-input bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <GoogleIcon />
        {label} with Google
      </button>
      {notice && (
        <p className="text-center text-xs text-muted-foreground" role="status">
          Google sign-in is coming soon.
        </p>
      )}
    </div>
  )
}

/** A labelled divider, e.g. "or continue with". */
export function AuthDivider({ label = "or continue with" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
