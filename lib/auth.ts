// ─────────────────────────────────────────────
// Google OAuth — PKCE flow (no client secret)
//
// Uses Desktop application OAuth client ID.
// PKCE means the client secret is never needed
// — safe to use directly from the extension.
//
// Persistence strategy:
//   • refresh_token stored in chrome.storage.local
//   • Background alarm refreshes access_token every 55 min
//   • User stays logged in until they explicitly log out
//     or revoke access (or 6 months of inactivity)
// ─────────────────────────────────────────────

import type { AuthTokens, GoogleUser } from "~lib/types"
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_SCOPES,
  TOKEN_REFRESH_BUFFER_MS
} from "~lib/constants"
import { getTokens, setTokens, setUser, clearAuth } from "~lib/storage"

// ── PKCE Helpers ──────────────────────────────

function generateCodeVerifier(): string {
  const array = new Uint8Array(48)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

// ── OAuth Flow ────────────────────────────────

export async function initiateGoogleLogin(): Promise<GoogleUser> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      "PLASMO_PUBLIC_GOOGLE_CLIENT_ID is not set. Add it to .env.local."
    )
  }

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // chrome.identity.getRedirectURL() works on Chrome & Edge.
  // On Firefox, browser.identity.getRedirectURL() is the equivalent —
  // webextension-polyfill handles this transparently.
  const redirectUri = chrome.identity.getRedirectURL("oauth2")

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", GOOGLE_SCOPES)
  authUrl.searchParams.set("code_challenge", codeChallenge)
  authUrl.searchParams.set("code_challenge_method", "S256")
  authUrl.searchParams.set("access_type", "offline")
  // "consent" ensures we always receive a refresh_token on first login
  authUrl.searchParams.set("prompt", "consent")

  const callbackUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (url) => {
        if (chrome.runtime.lastError || !url) {
          reject(
            new Error(
              chrome.runtime.lastError?.message ?? "Authentication cancelled."
            )
          )
        } else {
          resolve(url)
        }
      }
    )
  })

  const { searchParams } = new URL(callbackUrl)
  const code = searchParams.get("code")

  if (!code) {
    const error = searchParams.get("error") ?? "unknown"
    throw new Error(`Google OAuth error: ${error}`)
  }

  // Exchange authorization code for tokens using PKCE
  // (no client_secret needed for Desktop application type)
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}))
    throw new Error((err as any).error_description ?? "Token exchange failed.")
  }

  const raw = await tokenRes.json()

  const tokens: AuthTokens = {
    access_token:  raw.access_token,
    refresh_token: raw.refresh_token,
    expires_at:    Date.now() + raw.expires_in * 1000,
    scope:         raw.scope,
    token_type:    raw.token_type
  }

  await setTokens(tokens)

  // Fetch the user's profile
  const user = await fetchUserProfile(tokens.access_token)
  await setUser(user)

  return user
}

// ── Token Refresh ─────────────────────────────

export async function refreshAccessToken(): Promise<string> {
  const stored = await getTokens()
  if (!stored?.refresh_token) throw new Error("No refresh token available.")

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      refresh_token: stored.refresh_token,
      grant_type: "refresh_token"
    })
  })

  if (!res.ok) {
    // Refresh token revoked / expired — force re-login
    await clearAuth()
    throw new Error("Session expired. Please sign in again.")
  }

  const data = await res.json()

  await setTokens({
    ...stored,
    access_token: data.access_token,
    expires_at:   Date.now() + data.expires_in * 1000
  })

  return data.access_token as string
}

// Returns a valid access token, refreshing silently if needed
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getTokens()
  if (!tokens) return null

  const isExpiringSoon =
    tokens.expires_at - Date.now() < TOKEN_REFRESH_BUFFER_MS

  if (isExpiringSoon) {
    try {
      return await refreshAccessToken()
    } catch {
      return null
    }
  }

  return tokens.access_token
}

// ── User Profile ──────────────────────────────

async function fetchUserProfile(accessToken: string): Promise<GoogleUser> {
  const res = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) throw new Error("Failed to fetch user profile.")
  return res.json() as Promise<GoogleUser>
}

// ── Logout ────────────────────────────────────

export async function logout(): Promise<void> {
  const tokens = await getTokens()

  if (tokens?.access_token) {
    // Best-effort token revocation
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`,
      { method: "POST" }
    ).catch(() => {})
  }

  await clearAuth()
}
