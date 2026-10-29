import { API_BASE_URL, ApiError, apiFetch } from "@/lib/api/client"
import type { ImportJob } from "@/lib/types/analytics"

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024

type UploadOptions = {
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

export function uploadSalesCsv(file: File, token: string, { onProgress, signal }: UploadOptions = {}) {
  return new Promise<ImportJob>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${API_BASE_URL}/api/sales/imports/`)
    xhr.setRequestHeader("Authorization", `Bearer ${token}`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }

    xhr.onload = () => {
      const data = parseJson(xhr.responseText)
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as ImportJob)
      } else {
        reject(new ApiError(errorMessage(data, xhr.status), xhr.status, data))
      }
    }
    xhr.onerror = () => reject(new ApiError("Network error while uploading the file.", 0, null))
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"))

    if (signal) {
      if (signal.aborted) return reject(new DOMException("Upload cancelled", "AbortError"))
      signal.addEventListener("abort", () => xhr.abort(), { once: true })
    }

    const form = new FormData()
    form.append("file", file)
    xhr.send(form)
  })
}

export function getImportJob(id: number, token: string) {
  return apiFetch<ImportJob>(`/api/sales/imports/${id}/`, { token })
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

function errorMessage(data: unknown, status: number) {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>
    if (typeof record.detail === "string") return record.detail
    const fileErrors = record.file
    if (Array.isArray(fileErrors) && typeof fileErrors[0] === "string") return fileErrors[0]
  }
  if (status === 413) return "The file is too large for the server."
  return `Upload failed with status ${status}.`
}
