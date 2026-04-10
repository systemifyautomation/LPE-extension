// ─────────────────────────────────────────────
// n8n API client
//
// All application logic (clients, valuations,
// etc.) is powered by n8n webhooks. Configure
// your workflows there and call them here.
// ─────────────────────────────────────────────

import { N8N_BASE_URL, N8N_WEBHOOK_TOKEN } from "~lib/constants"
import { getValidAccessToken } from "~lib/auth"
import type { Client, N8nResponse } from "~lib/types"

// ── Core fetch wrapper ────────────────────────

async function n8nFetch<T>(
  webhookPath: string,
  options: RequestInit = {}
): Promise<N8nResponse<T>> {
  if (!N8N_BASE_URL) {
    return { success: false, error: "N8N_BASE_URL is not configured." }
  }

  const googleToken = await getValidAccessToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(N8N_WEBHOOK_TOKEN
      ? { "X-LPE-Token": N8N_WEBHOOK_TOKEN }
      : {}),
    ...(googleToken
      ? { "X-Google-Token": googleToken }
      : {})
  }

  const url = `${N8N_BASE_URL}/webhook/${webhookPath.replace(/^\//, "")}`

  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) }
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      return { success: false, error: `n8n error ${res.status}: ${text}` }
    }

    const data = await res.json()
    return { success: true, data: data as T }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error"
    return { success: false, error: message }
  }
}

// ── Clients ───────────────────────────────────

export async function getClients(): Promise<N8nResponse<Client[]>> {
  return n8nFetch<Client[]>("lpe/clients")
}

export async function getClient(id: string): Promise<N8nResponse<Client>> {
  return n8nFetch<Client>(`lpe/clients/${id}`)
}

// ── Valuations ────────────────────────────────

export async function triggerValuationRefresh(
  clientId: string
): Promise<N8nResponse<void>> {
  return n8nFetch<void>("lpe/valuations/refresh", {
    method: "POST",
    body: JSON.stringify({ clientId })
  })
}
