"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBusinessContext } from "@/lib/context/business-context"
import { getAccessToken } from "@/lib/auth/tokens"
import { activateBusiness, listBusinesses } from "@/lib/api/business-service"
import type { BusinessSummary } from "@/lib/types/business"

// ── sub-components ────────────────────────────────────────────────────────────

function LetterAvatar({
  name,
  size = "md",
}: {
  name: string
  size?: "sm" | "md"
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-sidebar-accent font-semibold text-sidebar-foreground",
        size === "md" ? "size-7 text-[13px]" : "size-5 text-[11px]",
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 animate-pulse">
      <div className="size-7 rounded-md bg-sidebar-accent shrink-0" />
      <div className="h-3 w-28 rounded bg-sidebar-accent flex-1" />
      <div className="size-3.5 rounded bg-sidebar-accent shrink-0" />
    </div>
  )
}

function SwitcherDropdown({
  activeId,
  businesses,
  loading,
  switchingId,
  onSelect,
  onCreateNew,
}: {
  activeId: number
  businesses: BusinessSummary[]
  loading: boolean
  switchingId: number | null
  onSelect: (id: number) => void
  onCreateNew: () => void
}) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-border bg-popover shadow-md z-50 overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ul className="py-1" role="listbox">
            {businesses.map((biz) => {
              const isActive = biz.id === activeId
              const isSwitching = switchingId === biz.id
              return (
                <li key={biz.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    disabled={switchingId !== null || isActive}
                    onClick={() => onSelect(biz.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-default"
                  >
                    <LetterAvatar name={biz.name} size="sm" />
                    <span className="flex-1 truncate text-left text-foreground">{biz.name}</span>
                    {isSwitching && (
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                    )}
                    {isActive && !isSwitching && (
                      <Check className="size-3.5 shrink-0 text-primary" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-border py-1">
            <button
              type="button"
              onClick={onCreateNew}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-4 shrink-0" />
              Create new business
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function BusinessInfoCard({ collapsed = false }: { collapsed?: boolean }) {
  const { activeBusiness, loadingBusiness, refreshBusiness } = useBusinessContext()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [switchingId, setSwitchingId] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onOutsideClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onOutsideClick)
    return () => document.removeEventListener("mousedown", onOutsideClick)
  }, [open])

  async function toggleOpen() {
    if (!activeBusiness) {
      router.push("/onboarding")
      return
    }
    if (!open) {
      setOpen(true)
      const token = getAccessToken()
      if (!token) return
      setLoadingList(true)
      try {
        setBusinesses(await listBusinesses(token))
      } finally {
        setLoadingList(false)
      }
    } else {
      setOpen(false)
    }
  }

  async function handleSwitch(id: number) {
    const token = getAccessToken()
    if (!token || switchingId) return
    setSwitchingId(id)
    try {
      await activateBusiness(id, token)
      refreshBusiness()
      setOpen(false)
    } finally {
      setSwitchingId(null)
    }
  }

  function handleCreateNew() {
    setOpen(false)
    router.push("/onboarding")
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative border-t border-sidebar-border py-3",
        collapsed ? "px-2" : "px-3",
      )}
    >
      {loadingBusiness ? (
        collapsed ? (
          <div className="flex justify-center">
            <div className="size-7 rounded-md bg-sidebar-accent animate-pulse" />
          </div>
        ) : (
          <Skeleton />
        )
      ) : collapsed ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={toggleOpen}
            title={activeBusiness?.name ?? "Set up workspace"}
            className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {activeBusiness ? (
              <LetterAvatar name={activeBusiness.name} />
            ) : (
              <Plus className="size-4 text-muted-foreground" />
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={toggleOpen}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent"
        >
          {activeBusiness ? (
            <LetterAvatar name={activeBusiness.name} />
          ) : (
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed border-sidebar-border text-muted-foreground">
              <Plus className="size-3.5" />
            </span>
          )}

          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium text-sidebar-foreground leading-tight">
              {activeBusiness?.name ?? "Set up workspace"}
            </span>
            {activeBusiness && (
              <span className="block text-[11px] text-muted-foreground leading-tight">
                {activeBusiness.current_user_role}
              </span>
            )}
          </span>

          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      )}

      {open && activeBusiness && (
        <SwitcherDropdown
          activeId={activeBusiness.id}
          businesses={businesses}
          loading={loadingList}
          switchingId={switchingId}
          onSelect={handleSwitch}
          onCreateNew={handleCreateNew}
        />
      )}
    </div>
  )
}
