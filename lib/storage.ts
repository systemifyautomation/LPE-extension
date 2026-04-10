import { Storage } from "@plasmohq/storage"
import type { AuthTokens, GoogleUser } from "~lib/types"
import {
  STORAGE_KEY_TOKENS,
  STORAGE_KEY_USER
} from "~lib/constants"

// Singleton storage instance (local area — not synced across devices)
const storage = new Storage({ area: "local" })

// ── Tokens ────────────────────────────────────

export async function getTokens(): Promise<AuthTokens | null> {
  const tokens = await storage.get<AuthTokens>(STORAGE_KEY_TOKENS)
  return tokens ?? null
}

export async function setTokens(tokens: AuthTokens): Promise<void> {
  await storage.set(STORAGE_KEY_TOKENS, tokens)
}

export async function clearTokens(): Promise<void> {
  await storage.remove(STORAGE_KEY_TOKENS)
}

// ── User Profile ──────────────────────────────

export async function getUser(): Promise<GoogleUser | null> {
  const user = await storage.get<GoogleUser>(STORAGE_KEY_USER)
  return user ?? null
}

export async function setUser(user: GoogleUser): Promise<void> {
  await storage.set(STORAGE_KEY_USER, user)
}

export async function clearUser(): Promise<void> {
  await storage.remove(STORAGE_KEY_USER)
}

// ── Auth helpers ──────────────────────────────

export async function clearAuth(): Promise<void> {
  await Promise.all([clearTokens(), clearUser()])
}

export async function isAuthenticated(): Promise<boolean> {
  const [user, tokens] = await Promise.all([getUser(), getTokens()])
  return !!(user && tokens?.refresh_token)
}
