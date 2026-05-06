/**
 * src/layouts/MainLayout.tsx
 *
 * ÉTAPE 6 — Guard de route via ProtectedRoute.
 * ÉTAPE 7 — useSocket() : connexion temps réel globale.
 * ÉTAPE 8 — useOnlineStatus() : détection hors ligne + flush queue.
 * ÉTAPE 9 — useSyncStatus() : statut sync cloud.
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/ui/Sidebar'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { useNotificationsPlats } from '../hooks/useNotificationsPlats'
import { useSocket } from '../hooks/useSocket'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useSyncStatus } from '../hooks/useSyncStatus'
import './MainLayout.css'

const NO_PADDING_ROUTES = ['/ventes/commande']

export default function MainLayout() {
  const [badgeVentes, setBadgeVentes] = useState(0)

  // ÉTAPE 7 — Connexion Socket.IO globale
  const { status: socketStatus } = useSocket()

  // ÉTAPE 8 — Statut réseau + queue hors ligne
  const onlineStatus = useOnlineStatus()

  // ÉTAPE 9 — Statut sync cloud
  const syncStatus = useSyncStatus()

  // Notifications plats prêts
  useNotificationsPlats(setBadgeVentes)

  const noPadding = NO_PADDING_ROUTES.some((r) =>
    window.location.hash.replace('#', '').startsWith(r)
  )

  return (
    <ProtectedRoute>
      <div className="layout">
        <Sidebar
          badgeVentes={badgeVentes}
          socketStatus={socketStatus}
          onlineStatus={onlineStatus}
          syncStatus={syncStatus}
        />
        <main className={`layout-content ${noPadding ? 'no-padding' : ''}`}>
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  )
}
