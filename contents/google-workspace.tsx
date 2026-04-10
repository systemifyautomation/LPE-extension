// ─────────────────────────────────────────────
// Content Script — Google Workspace integration
//
// Injected into: docs.google.com, sheets.google.com,
//                drive.google.com, gmail.google.com
//
// Shows a subtle floating action button (FAB) so users
// can open the LPE panel without leaving the page.
// ─────────────────────────────────────────────

import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import { useEffect, useState } from "react"
import { isAuthenticated } from "~lib/storage"
import "~style.css"

export const config: PlasmoCSConfig = {
  matches: [
    "https://docs.google.com/*",
    "https://sheets.google.com/*",
    "https://drive.google.com/*",
    "https://mail.google.com/*"
  ],
  run_at: "document_idle"
}

// Mount the FAB into a portal at the bottom-right of the page
export const getInlineAnchor: PlasmoGetInlineAnchor = () => ({
  element: document.body,
  insertPosition: "afterbegin"
})

function LpeFab() {
  const [visible, setVisible]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    isAuthenticated().then(setVisible)
  }, [])

  function openPopup() {
    // Opens the extension popup via runtime message
    chrome.runtime.sendMessage({ type: "OPEN_POPUP" })
  }

  if (!visible) return null

  return (
    <div
      style={{ zIndex: 2147483647 }}
      className="fixed bottom-6 right-6 flex flex-col items-end gap-2 animate-fade-in"
    >
      {/* Quick-action tooltip */}
      {expanded && (
        <div className="bg-white rounded-xl shadow-lpe border border-lpe-border p-3 text-xs text-lpe-navy w-52 animate-slide-up">
          <p className="font-semibold mb-1">LPE is active</p>
          <p className="text-lpe-gray-dark leading-relaxed">
            Click the extension icon in your toolbar to open the full dashboard.
          </p>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setExpanded((v) => !v)}
        title="LPE Extension"
        className="
          w-12 h-12 rounded-xl bg-lpe-navy text-white
          flex items-center justify-center font-black text-sm
          shadow-lpe border-2 border-lpe-orange
          hover:bg-[#0a1c4a] active:scale-95
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lpe-orange
        "
      >
        LPE
      </button>
    </div>
  )
}

export default LpeFab
