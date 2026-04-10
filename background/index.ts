// ─────────────────────────────────────────────
// Background Service Worker
//
// Responsibilities:
//   1. Schedule token refresh alarm every 55 min
//   2. Silently refresh the Google access token
//   3. Reset alarm after each refresh
//   4. Relay messages from popup / content scripts
// ─────────────────────────────────────────────

import { TOKEN_REFRESH_ALARM } from "~lib/constants"
import { refreshAccessToken } from "~lib/auth"
import { getTokens, isAuthenticated } from "~lib/storage"

// ── Alarm: token refresh ──────────────────────

async function scheduleTokenRefresh(): Promise<void> {
  // Alarm fires after delay (minutes). 55 min < 60 min token lifetime.
  chrome.alarms.create(TOKEN_REFRESH_ALARM, {
    delayInMinutes: 55,
    periodInMinutes: 55
  })
}

async function handleTokenRefreshAlarm(): Promise<void> {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    // No active session — remove the alarm
    chrome.alarms.clear(TOKEN_REFRESH_ALARM)
    return
  }

  const tokens = await getTokens()
  if (!tokens) return

  const minutesUntilExpiry =
    (tokens.expires_at - Date.now()) / 1000 / 60

  // Only refresh if expiry is within the next 60 minutes
  if (minutesUntilExpiry > 60) return

  try {
    await refreshAccessToken()
  } catch (err) {
    // Refresh token revoked — user will see login screen on next popup open
    console.warn("[LPE] Token refresh failed:", err)
    chrome.alarms.clear(TOKEN_REFRESH_ALARM)
  }
}

// ── Alarm listener ────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TOKEN_REFRESH_ALARM) {
    handleTokenRefreshAlarm()
  }
})

// ── Message relay ─────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "AUTH_SUCCESS":
      scheduleTokenRefresh()
      sendResponse({ ok: true })
      break

    case "AUTH_LOGOUT":
      chrome.alarms.clear(TOKEN_REFRESH_ALARM)
      sendResponse({ ok: true })
      break

    case "GET_AUTH_STATUS":
      isAuthenticated().then((auth) => sendResponse({ authenticated: auth }))
      return true // Keeps the message channel open for async response

    default:
      sendResponse({ ok: false, error: "Unknown message type" })
  }
})

// ── Extension installed / updated ────────────

chrome.runtime.onInstalled.addListener(async () => {
  const authenticated = await isAuthenticated()
  if (authenticated) {
    // Resume alarm if the extension was updated while user was logged in
    await scheduleTokenRefresh()
  }
})

// ── On startup (browser restart) ─────────────

chrome.runtime.onStartup.addListener(async () => {
  const authenticated = await isAuthenticated()
  if (authenticated) {
    // Refresh immediately on startup in case token expired during shutdown
    try {
      await refreshAccessToken()
    } catch {}
    await scheduleTokenRefresh()
  }
})
