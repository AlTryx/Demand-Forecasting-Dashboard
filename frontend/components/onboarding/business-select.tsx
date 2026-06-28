"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, CheckCircle2, ChevronRight, Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { getAccessToken } from "@/lib/auth/tokens"
import { listBusinesses, createBusiness, activateBusiness } from "@/lib/api/business-service"
import { useBusinessContext } from "@/lib/context/business-context"
import type { BusinessSummary } from "@/lib/types/business"

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  employee: "Employee",
}

export function BusinessSelect() {
  const router = useRouter()
  const { refreshBusiness } = useBusinessContext()

  const [businesses, setBusinesses] = useState<BusinessSummary[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [activatingId, setActivatingId] = useState<number | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [nameError, setNameError] = useState("")

  const loadBusinesses = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setLoadingList(true)
    try {
      const data = await listBusinesses(token)
      setBusinesses(data)
      if (data.length === 0) setShowCreate(true)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    loadBusinesses()
  }, [loadBusinesses])

  async function handleSelect(id: number) {
    const token = getAccessToken()
    if (!token || activatingId) return
    setActivatingId(id)
    try {
      await activateBusiness(id, token)
      refreshBusiness()
      router.replace("/dashboard")
    } finally {
      setActivatingId(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      setNameError("Business name is required.")
      return
    }
    const token = getAccessToken()
    if (!token) return
    setCreating(true)
    setNameError("")
    try {
      await createBusiness(name, token)
      refreshBusiness()
      router.replace("/dashboard")
    } catch {
      setNameError("Could not create business. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  if (loadingList) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {businesses.length > 0 && (
        <section className="space-y-2">
          <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
            Your workspaces
          </p>
          <ul className="space-y-2">
            {businesses.map((biz) => {
              const isActivating = activatingId === biz.id
              return (
                <li key={biz.id}>
                  <button
                    type="button"
                    disabled={activatingId !== null}
                    onClick={() => handleSelect(biz.id)}
                    className={cn(
                      "group relative flex w-full items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-all",
                      "hover:border-primary/50 hover:bg-card/80 hover:shadow-sm",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      biz.is_active && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="size-5 text-primary" aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{biz.name}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {ROLE_LABEL[biz.role] ?? biz.role} ·{" "}
                        {new Date(biz.created_at).getFullYear()}
                      </p>
                    </div>

                    {biz.is_active && !isActivating && (
                      <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    )}
                    {isActivating ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      !biz.is_active && (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      )
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="size-4" aria-hidden="true" />
          Create new business
        </button>
      ) : (
        <section className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="font-semibold text-foreground">
            {businesses.length === 0 ? "Create your first workspace" : "New workspace"}
          </p>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="business-name" className="text-[13px] font-medium text-foreground">
                Business name
              </label>
              <input
                id="business-name"
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  if (nameError) setNameError("")
                }}
                placeholder="e.g. My Store"
                maxLength={30}
                autoFocus
                className={cn(
                  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                  nameError && "border-destructive focus:ring-destructive/30",
                )}
              />
              {nameError && (
                <p className="text-[12px] text-destructive">{nameError}</p>
              )}
            </div>

            <div className="flex gap-2">
              {businesses.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewName(""); setNameError("") }}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={creating}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {creating && <Loader2 className="size-4 animate-spin" />}
                {creating ? "Creating…" : "Create & Enter"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
