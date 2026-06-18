/**
 * Centralized API client for the Django backend.
 *
 * The base URL is configurable via the `NEXT_PUBLIC_API_BASE_URL` environment
 * variable so the same build can target local, staging, and production
 * backends without code changes. It falls back to the local Django dev server.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "")

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  /** Plain object body that will be JSON-serialized. */
  body?: unknown
  /** Bearer token to attach as the Authorization header. */
  token?: string | null
}

/**
 * Thin wrapper around fetch that:
 * - prefixes the configured API base URL
 * - serializes/parses JSON
 * - attaches a bearer token when provided
 * - throws a typed ApiError on non-2xx responses
 */
export async function apiFetch<T = unknown>(
  path: string,
  { body, token, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const finalHeaders = new Headers(headers)
  if (body !== undefined) {
    finalHeaders.set("Content-Type", "application/json")
  }
  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Try to parse a JSON payload; tolerate empty bodies (e.g. 204).
  const text = await response.text()
  const data = text ? safeJsonParse(text) : null

  if (!response.ok) {
    const message =
      (isRecord(data) && typeof data.detail === "string" && data.detail) ||
      `Request to ${path} failed with status ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data as T
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
