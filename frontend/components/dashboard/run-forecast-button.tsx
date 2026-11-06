"use client"

import { useEffect, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { runForecast } from "@/lib/api/forecasting-service"
import { getAccessToken } from "@/lib/auth/tokens"
import { formatNumber } from "@/lib/format"

type RunForecastButtonProps = {
  disabled?: boolean
  onDone: () => void
}

export function RunForecastButton({ disabled, onDone }: RunForecastButtonProps) {
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [message])

  const run = async () => {
    const token = getAccessToken()
    if (!token) return
    setRunning(true)
    setMessage(null)
    try {
      const { forecasts_created } = await runForecast(token)
      setMessage({
        text: forecasts_created
          ? `${formatNumber(forecasts_created)} forecasts created`
          : "Not enough complete weeks of sales to forecast",
        error: forecasts_created === 0,
      })
      onDone()
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Forecast failed", error: true })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span className={message.error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {message.text}
        </span>
      )}
      <Button type="button" size="sm" onClick={run} disabled={disabled || running}>
        {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {running ? "Forecasting…" : "Run forecast"}
      </Button>
    </div>
  )
}
