import { useEffect, useState, useCallback } from "react"
import { logout } from "~lib/auth"
import { getClients } from "~lib/n8n"
import type { Client, GoogleUser } from "~lib/types"
import { ClientCard } from "~components/dashboard/ClientCard"
import { Button } from "~components/ui/Button"
import { Spinner } from "~components/ui/Spinner"
import { LogOut, RefreshCw, Search, ChevronDown } from "lucide-react"

interface DashboardProps {
  user: GoogleUser
  onLogout: () => void
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [clients, setClients]       = useState<Client[]>([])
  const [filtered, setFiltered]     = useState<Client[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [query, setQuery]           = useState("")
  const [showMenu, setShowMenu]     = useState(false)

  const loadClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await getClients()
    if (res.success && res.data) {
      setClients(res.data)
      setFiltered(res.data)
    } else {
      setError(res.error ?? "Failed to load clients.")
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  // Filter clients by search query
  useEffect(() => {
    const q = query.trim().toLowerCase()
    setFiltered(
      q
        ? clients.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.industry.toLowerCase().includes(q)
          )
        : clients
    )
  }, [query, clients])

  async function handleLogout() {
    await logout()
    chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" })
    onLogout()
  }

  return (
    <div className="flex flex-col h-full bg-lpe-gray animate-fade-in">
      {/* ── Top bar ───────────────────────────── */}
      <header className="bg-lpe-navy px-4 py-3 flex items-center gap-3">
        {/* Logo mark */}
        <div className="w-7 h-7 bg-white/10 border border-lpe-orange/40 rounded-md flex items-center justify-center shrink-0">
          <span className="text-white font-black text-[11px] tracking-tight">LPE</span>
        </div>

        <span className="text-white font-semibold text-sm flex-1 truncate">
          LPE Extension
        </span>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-1.5 group"
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-7 h-7 rounded-full border border-white/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-lpe-orange flex items-center justify-center text-white text-xs font-bold">
                {user.given_name?.[0] ?? "?"}
              </div>
            )}
            <ChevronDown
              size={12}
              className="text-white/60 group-hover:text-white transition-colors"
            />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lpe border border-lpe-border z-50 animate-slide-up overflow-hidden">
              <div className="px-4 py-3 border-b border-lpe-border">
                <p className="text-sm font-semibold text-lpe-navy truncate">{user.name}</p>
                <p className="text-xs text-lpe-gray-dark truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Search bar ────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-lpe-gray-dark/50 pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="
              w-full pl-8 pr-3 py-2 text-sm rounded-lg
              bg-white border border-lpe-border
              focus:outline-none focus:ring-2 focus:ring-lpe-orange focus:border-transparent
              placeholder:text-lpe-gray-dark/40
            "
          />
        </div>
      </div>

      {/* ── Section header ────────────────────── */}
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-lpe-gray-dark uppercase tracking-wider">
          Clients
          {!loading && (
            <span className="ml-1.5 font-normal normal-case">
              ({filtered.length})
            </span>
          )}
        </span>

        <button
          onClick={loadClients}
          disabled={loading}
          title="Refresh"
          className="p-1 rounded-md text-lpe-gray-dark/60 hover:text-lpe-navy hover:bg-lpe-gray transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Client list ───────────────────────── */}
      <main className="flex-1 overflow-y-auto lpe-scrollbar px-4 pb-4 flex flex-col gap-2">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 animate-fade-in">
            <p className="font-semibold mb-1">Could not load clients</p>
            <p className="text-xs text-red-600/80">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={loadClients}
            >
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-lpe-gray flex items-center justify-center mb-3">
              <Search size={18} className="text-lpe-gray-dark/40" />
            </div>
            <p className="text-sm font-medium text-lpe-navy">
              {query ? "No clients found" : "No clients yet"}
            </p>
            <p className="text-xs text-lpe-gray-dark mt-1">
              {query
                ? "Try a different search term."
                : "Clients will appear here once added."}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
      </main>

      {/* ── Footer ────────────────────────────── */}
      <footer className="px-4 py-2 border-t border-lpe-border flex items-center justify-between">
        <span className="text-[10px] text-lpe-gray-dark/40">
          LPE Legal Intelligence
        </span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-lpe-gray-dark/50">Connected</span>
        </div>
      </footer>

      {/* Backdrop for menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}
