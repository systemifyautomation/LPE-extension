// ─────────────────────────────────────────────
// Shared TypeScript types for the LPE extension
// ─────────────────────────────────────────────

export interface GoogleUser {
  id: string
  email: string
  name: string
  given_name: string
  family_name: string
  picture: string
  hd?: string  // hosted domain (Google Workspace org)
}

export interface AuthTokens {
  access_token: string
  refresh_token: string  // long-lived
  expires_at: number     // epoch ms
  scope: string
  token_type: string
}

export interface AuthState {
  user: GoogleUser | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
}

// ── LPE Domain Types ──────────────────────────

export type DealStatus = "active" | "pending" | "closed" | "on-hold"

export interface Client {
  id: string
  name: string
  spreadsheetId?: string  // Google Sheets file ID
  dealStatus: DealStatus
  industry: string
  estimatedValue?: number  // USD
  currency?: string
  lastUpdated: string      // ISO date
}

export interface ValuationSheet {
  spreadsheetId: string
  sheetName: string
  clientName: string
  tabs: SheetTab[]
}

export interface SheetTab {
  sheetId: number
  title: string
  type: "summary" | "dcf" | "comps" | "lbo" | "other"
}

// ── n8n Webhook Response ──────────────────────

export interface N8nResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
