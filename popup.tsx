import { useEffect, useState } from "react"
import { getUser } from "~lib/storage"
import type { GoogleUser } from "~lib/types"
import { LoginScreen } from "~components/auth/LoginScreen"
import { Dashboard } from "~components/dashboard/Dashboard"
import { FullPageSpinner } from "~components/ui/Spinner"
import "~style.css"

function IndexPopup() {
  const [user, setUser]       = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Check stored session on mount — no network call needed
  useEffect(() => {
    getUser()
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="w-[400px] h-[580px] flex items-center justify-center bg-lpe-gray">
        <FullPageSpinner />
      </div>
    )
  }

  return (
    <div className="w-[400px] h-[580px] overflow-hidden flex flex-col">
      {user ? (
        <Dashboard user={user} onLogout={() => setUser(null)} />
      ) : (
        <LoginScreen onLogin={setUser} />
      )}
    </div>
  )
}

export default IndexPopup
