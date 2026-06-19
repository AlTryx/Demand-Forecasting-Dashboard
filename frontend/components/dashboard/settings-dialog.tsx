"use client"

import { useEffect, useState } from "react"
import { Settings as SettingsIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Modal } from "./modal"

export type DashboardSettings = {
  currency: "EUR" | "USD"
  horizonDays: 7 | 14 | 30
  stockoutAlerts: boolean
  weeklyDigest: boolean
  liveStream: boolean
}

export const DEFAULT_SETTINGS: DashboardSettings = {
  currency: "EUR",
  horizonDays: 30,
  stockoutAlerts: true,
  weeklyDigest: false,
  liveStream: true,
}

function SegmentedControl<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex rounded-lg border border-border bg-muted/50 p-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              value === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-card shadow transition-all",
            checked ? "left-[1.375rem]" : "left-0.5",
          )}
        />
      </button>
    </label>
  )
}

type SettingsDialogProps = {
  open: boolean
  onClose: () => void
  settings: DashboardSettings
  onSave: (settings: DashboardSettings) => void
}

export function SettingsDialog({
  open,
  onClose,
  settings,
  onSave,
}: SettingsDialogProps) {
  const [draft, setDraft] = useState<DashboardSettings>(settings)

  // Reset the working copy whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) setDraft(settings)
  }, [open, settings])

  const set = <K extends keyof DashboardSettings>(
    key: K,
    value: DashboardSettings[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Tune how forecasts are displayed and delivered."
      icon={<SettingsIcon className="size-4" />}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft)
              onClose()
            }}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Save changes
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <SegmentedControl
          label="Display currency"
          value={draft.currency}
          onChange={(v) => set("currency", v)}
          options={[
            { value: "EUR", label: "EUR (€)" },
            { value: "USD", label: "USD ($)" },
          ]}
        />
        <SegmentedControl
          label="Forecast horizon"
          value={draft.horizonDays}
          onChange={(v) => set("horizonDays", v)}
          options={[
            { value: 7, label: "7 days" },
            { value: 14, label: "14 days" },
            { value: 30, label: "30 days" },
          ]}
        />

        <div className="flex flex-col gap-4 border-t border-border pt-5">
          <Toggle
            label="Stockout risk alerts"
            description="Email me when a SKU drops below safety stock."
            checked={draft.stockoutAlerts}
            onChange={(v) => set("stockoutAlerts", v)}
          />
          <Toggle
            label="Weekly forecast digest"
            description="A Monday summary of the week's predictions."
            checked={draft.weeklyDigest}
            onChange={(v) => set("weeklyDigest", v)}
          />
          <Toggle
            label="Live prediction stream"
            description="Stream new forecast-log entries in real time."
            checked={draft.liveStream}
            onChange={(v) => set("liveStream", v)}
          />
        </div>
      </div>
    </Modal>
  )
}
