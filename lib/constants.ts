// ─────────────────────────────────────────────
// App-wide constants
// ─────────────────────────────────────────────

export const GOOGLE_CLIENT_ID =
  process.env.PLASMO_PUBLIC_GOOGLE_CLIENT_ID ?? ""

export const N8N_BASE_URL =
  process.env.PLASMO_PUBLIC_N8N_BASE_URL ?? ""

export const N8N_WEBHOOK_TOKEN =
  process.env.PLASMO_PUBLIC_N8N_WEBHOOK_TOKEN ?? ""

// Google OAuth scopes requested by the extension
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly"
].join(" ")

// Storage keys
export const STORAGE_KEY_TOKENS = "lpe_tokens"
export const STORAGE_KEY_USER   = "lpe_user"

// Token refresh: refresh 5 minutes before expiry
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

// Alarm name used by background service worker
export const TOKEN_REFRESH_ALARM = "lpe_token_refresh"
