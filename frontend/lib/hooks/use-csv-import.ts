"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Papa from "papaparse"
import { getAccessToken } from "@/lib/auth/tokens"
import { checkCsvPreview, type CsvRow } from "@/lib/csv-validation"
import {
  MAX_UPLOAD_BYTES,
  getImportJob,
  uploadSalesCsv,
} from "@/lib/api/sales-import-service"
import { formatBytes } from "@/lib/format"
import type { ImportJob } from "@/lib/types/analytics"

const PREVIEW_ROWS = 50
const POLL_INTERVAL_MS = 1500

export type CsvImportState =
  | { kind: "idle" }
  | { kind: "checking"; file: File }
  | { kind: "invalid"; file: File; errors: string[] }
  | { kind: "ready"; file: File; headers: string[]; preview: CsvRow[]; warnings: string[] }
  | { kind: "uploading"; file: File; progress: number }
  | { kind: "processing"; file: File; job: ImportJob }
  | { kind: "done"; file: File; job: ImportJob }
  | { kind: "failed"; file: File; message: string; job?: ImportJob }

export function useCsvImport(onImported: () => void) {
  const [state, setState] = useState<CsvImportState>({ kind: "idle" })
  const abortRef = useRef<AbortController | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onImportedRef = useRef(onImported)

  useEffect(() => {
    onImportedRef.current = onImported
  }, [onImported])

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current)
    pollRef.current = null
  }, [])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      stopPolling()
    },
    [stopPolling],
  )

  const selectFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setState({ kind: "invalid", file, errors: ["Please choose a .csv file."] })
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setState({
        kind: "invalid",
        file,
        errors: [`The file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`],
      })
      return
    }

    setState({ kind: "checking", file })
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      preview: PREVIEW_ROWS,
      complete: (result) => {
        const headers = result.meta.fields ?? []
        const { errors, warnings } = checkCsvPreview(headers, result.data)
        setState(
          errors.length
            ? { kind: "invalid", file, errors }
            : { kind: "ready", file, headers, preview: result.data, warnings },
        )
      },
      error: () => setState({ kind: "invalid", file, errors: ["Unable to read this CSV file."] }),
    })
  }, [])

  const poll = useCallback(
    (file: File, jobId: number) => {
      pollRef.current = setTimeout(async () => {
        const token = getAccessToken()
        if (!token) {
          setState({ kind: "failed", file, message: "Your session expired. Sign in again." })
          return
        }
        try {
          const job = await getImportJob(jobId, token)
          if (job.status === "done") {
            setState({ kind: "done", file, job })
            onImportedRef.current()
          } else if (job.status === "failed") {
            setState({ kind: "failed", file, job, message: job.error ?? "The import failed." })
          } else {
            setState({ kind: "processing", file, job })
            poll(file, jobId)
          }
        } catch {
          poll(file, jobId)
        }
      }, POLL_INTERVAL_MS)
    },
    [],
  )

  const startUpload = useCallback(async () => {
    if (state.kind !== "ready") return
    const { file } = state
    const token = getAccessToken()
    if (!token) {
      setState({ kind: "failed", file, message: "Your session expired. Sign in again." })
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setState({ kind: "uploading", file, progress: 0 })

    try {
      const job = await uploadSalesCsv(file, token, {
        signal: controller.signal,
        onProgress: (progress) => setState({ kind: "uploading", file, progress }),
      })
      setState({ kind: "processing", file, job })
      poll(file, job.id)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setState({ kind: "idle" })
        return
      }
      setState({
        kind: "failed",
        file,
        message: error instanceof Error ? error.message : "Upload failed.",
      })
    } finally {
      abortRef.current = null
    }
  }, [state, poll])

  const cancelUpload = useCallback(() => abortRef.current?.abort(), [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    stopPolling()
    setState({ kind: "idle" })
  }, [stopPolling])

  return { state, selectFile, startUpload, cancelUpload, reset }
}
