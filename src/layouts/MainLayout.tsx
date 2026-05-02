import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Sidebar from '../components/ui/Sidebar'
import { useNotificationsPlats } from '../hooks/useNotificationsPlats'
import './MainLayout.css'

const ROLE_ROUTES: Record<string, string[]> = {
  admin:          ['/dashboard', '/ventes', '/cuisine', '/hebergement', '/stock', '/rapports', '/utilisateurs'],
  gestionnaire:   ['/dashboard', '/ventes', '/stock', '/rapports'],
  comptable:      ['/dashboard', '/rapports'],
  serveur:        ['/ventes', '/ventes/commande'],
  cuisinier:      ['/cuisine'],
  receptionniste: ['/hebergement', '/ventes'],
}

export default function MainLayout() {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()
  const [badgeVentes, setBadgeVentes] = useState(0)

  useNotificationsPlats(setBadgeVentes)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const allowed = ROLE_ROUTES[user?.role || ''] || []
  const hasAccess = allowed.some((route) => location.pathname.startsWith(route))
  if (!hasAccess) return <Navigate to={allowed[0]} replace />

  return (
    <div className="layout">
      <Sidebar badgeVentes={badgeVentes} />
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  )
}
