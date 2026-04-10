import { useState } from "react"
import { initiateGoogleLogin } from "~lib/auth"
import type { GoogleUser } from "~lib/types"
import { Button } from "~components/ui/Button"

interface LoginScreenProps {
  onLogin: (user: GoogleUser) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    try {
      const user = await initiateGoogleLogin()
      // Tell background to start the refresh alarm
      chrome.runtime.sendMessage({ type: "AUTH_SUCCESS" })
      onLogin(user)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-lpe-gray animate-fade-in">
      {/* Header */}
      <div className="bg-lpe-navy px-6 py-8 flex flex-col items-center gap-4">
        {/* LPE Logo mark */}
        <div className="relative">
          <div className="w-16 h-16 bg-lpe-navy rounded-xl border-2 border-lpe-orange flex items-center justify-center shadow-lpe">
            <span className="text-white font-bold text-2xl tracking-tight">
              LPE
            </span>
          </div>
          {/* Orange corner accent */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-lpe-orange rounded-full" />
        </div>

        <div className="text-center">
          <h1 className="text-white text-xl font-bold tracking-tight">
            LPE Extension
          </h1>
          <p className="text-white/60 text-xs mt-1">
            M&amp;A Intelligence • Powered by n8n
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
        <div className="text-center">
          <h2 className="text-lpe-navy font-semibold text-base">
            Sign in to get started
          </h2>
          <p className="text-lpe-gray-dark text-sm mt-1 leading-relaxed">
            Access your client spreadsheets, valuations,<br />
            and deal pipeline — right inside your browser.
          </p>
        </div>

        {/* Google Sign In button */}
        <div className="w-full max-w-xs flex flex-col gap-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              bg-white border border-lpe-border shadow-sm
              hover:shadow-lpe hover:border-lpe-blue/40
              active:bg-lpe-gray transition-all duration-150
              disabled:opacity-60 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lpe-orange
            "
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-lpe-navy mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                {/* Google "G" logo SVG */}
                <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>

                <span className="flex-1 text-sm font-semibold text-gray-700 text-center">
                  {loading ? "Signing in…" : "Sign in with Google"}
                </span>
              </>
            )}
          </button>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700 animate-fade-in">
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-lpe-gray-dark/70 text-center max-w-xs leading-relaxed">
          You'll only be asked to sign in once. LPE only accesses your Google
          Sheets &amp; Drive files.
        </p>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-lpe-border text-center">
        <span className="text-[10px] text-lpe-gray-dark/50">
          LPE Legal Intelligence · All rights reserved
        </span>
      </div>
    </div>
  )
}
