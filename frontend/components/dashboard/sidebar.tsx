"use client"

import { useState } from "react"
import {
  Activity,
  ChevronLeft,
  LayoutGrid,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TrendingUp,
  Users,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { products } from "@/lib/forecast-data"
import { BusinessInfoCard } from "./business-info-card"
import {
  DEFAULT_SETTINGS,
  SettingsDialog,
  type DashboardSettings,
} from "./settings-dialog"
import { TeamDialog } from "./team-dialog"

type SidebarProps = {
  selected: string
  onSelect: (id: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ selected, onSelect, isOpen, onClose }: SidebarProps) {
  // Desktop collapse (icons-only rail). Persists across renders.
  const [collapsed, setCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS)

  return (
    <>
      {/* Overlay for mobile when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        data-collapsed={collapsed}
        className={cn(
          "group/sidebar flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
          "fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-64 md:w-[4.5rem]" : "w-64",
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4 md:px-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover/sidebar:scale-105">
            <TrendingUp className="size-4.5" aria-hidden="true" />
          </div>
          <div
            className={cn(
              "leading-tight transition-all duration-200",
              collapsed ? "md:w-0 md:overflow-hidden md:opacity-0" : "opacity-100",
            )}
          >
            <p className="whitespace-nowrap text-sm font-semibold text-sidebar-foreground">
              Forecast OS
            </p>
            <p className="whitespace-nowrap text-[11px] text-muted-foreground">
              Demand Intelligence
            </p>
          </div>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>

          {/* Mobile close */}
          <button
            type="button"
            className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent md:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Products nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
          <SectionLabel collapsed={collapsed}>Products</SectionLabel>
          <ul className="flex flex-col gap-1">
            {products.map((product, i) => {
              const isActive = selected === product.id
              const isOverview = product.id === "overview"
              const Icon = isOverview ? LayoutGrid : Package
              return (
                <li
                  key={product.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(product.id)
                      if (onClose) onClose()
                    }}
                    aria-current={isActive ? "page" : undefined}
                    title={collapsed ? product.label : undefined}
                    className={cn(
                      "group/item relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {/* active rail */}
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden="true"
                    />
                    <Icon
                      className="size-4 shrink-0 transition-transform duration-200 group-hover/item:scale-110"
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "flex-1 text-left transition-all duration-200",
                        collapsed
                          ? "md:w-0 md:overflow-hidden md:opacity-0"
                          : "opacity-100",
                      )}
                    >
                      {product.label}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[11px] tabular-nums text-muted-foreground/70 transition-all duration-200",
                        collapsed
                          ? "md:w-0 md:overflow-hidden md:opacity-0"
                          : "opacity-100",
                      )}
                    >
                      {product.sku}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="mt-6">
            <SectionLabel collapsed={collapsed}>Workspace</SectionLabel>
            <ul className="flex flex-col gap-1">
              <li>
                <RailButton
                  collapsed={collapsed}
                  icon={Users}
                  label="Team"
                  onClick={() => setTeamOpen(true)}
                />
              </li>
              <li>
                <RailButton
                  collapsed={collapsed}
                  icon={Settings}
                  label="Settings"
                  onClick={() => setSettingsOpen(true)}
                />
              </li>
            </ul>
          </div>
        </nav>

        <BusinessInfoCard collapsed={collapsed} />

        {/* Model health footer */}
        <div className="border-t border-sidebar-border px-3 py-4">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title={collapsed ? "Model Health — Online" : undefined}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Activity className="size-4 shrink-0" aria-hidden="true" />
            <span
              className={cn(
                "flex-1 text-left transition-all duration-200",
                collapsed ? "md:w-0 md:overflow-hidden md:opacity-0" : "opacity-100",
              )}
            >
              Model Health
            </span>
            <span
              className="relative flex size-2 shrink-0"
              aria-label="Model is online"
            >
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
          </button>
        </div>
      </aside>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />
      <TeamDialog open={teamOpen} onClose={() => setTeamOpen(false)} />
    </>
  )
}

function SectionLabel({
  children,
  collapsed,
}: {
  children: React.ReactNode
  collapsed: boolean
}) {
  return (
    <p
      className={cn(
        "px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-all duration-200",
        collapsed ? "md:h-0 md:overflow-hidden md:pb-0 md:opacity-0" : "opacity-100",
      )}
    >
      {children}
    </p>
  )
}

function RailButton({
  collapsed,
  icon: Icon,
  label,
  onClick,
}: {
  collapsed: boolean
  icon: typeof Settings
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className="group/item flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <Icon
        className="size-4 shrink-0 transition-transform duration-200 group-hover/item:scale-110"
        aria-hidden="true"
      />
      <span
        className={cn(
          "flex-1 text-left transition-all duration-200",
          collapsed ? "md:w-0 md:overflow-hidden md:opacity-0" : "opacity-100",
        )}
      >
        {label}
      </span>
      <ChevronLeft
        className={cn(
          "size-3.5 rotate-180 text-muted-foreground/40 transition-all duration-200 group-hover/item:translate-x-0.5 group-hover/item:text-muted-foreground",
          collapsed ? "md:hidden" : "",
        )}
        aria-hidden="true"
      />
    </button>
  )
}
