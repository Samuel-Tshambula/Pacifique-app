/**
 * src/components/auth/ProtectedRoute.tsx
 *
 * ÉTAPE 6 — Guard de route basé uniquement sur le rôle utilisateur.
 * config.json n'intervient jamais ici — seul le rôle du compte connecté compte.
 *
 * Comportements :
 *  - Non authentifié → redirect /login
 *  - Authentifié mais rôle non autorisé → redirect vers la première route du rôle
 *  - Authentifié et autorisé → rendu du contenu
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import type { Role } from '../../types'

// ─── Table de routage par rôle ────────────────────────────────────────────────
// Source unique de vérité pour les permissions de navigation.
// Toute modification ici se répercute automatiquement sur Sidebar + MainLayout.

export const ROLE_HOME: Record<Role, string> = {
  admin:          '/dashboard',
  gestionnaire:   '/dashboard',
  comptable:      '/dashboard',
  serveur:        '/ventes',
  cuisinier:      '/cuisine',
  receptionniste: '/hebergement',
}

export const ROLE_ALLOWED_ROUTES: Record<Role, string[]> = {
  admin: [
    '/dashboard', '/ventes', '/ventes/commande',
    '/cuisine', '/hebergement', '/stock',
    '/rapports', '/utilisateurs', '/configuration', '/ticket',
  ],
  gestionnaire: [
    '/dashboard', '/ventes', '/ventes/commande',
    '/stock', '/rapports', '/ticket',
  ],
  comptable: [
    '/dashboard', '/rapports', '/ticket',
  ],
  serveur: [
    '/ventes', '/ventes/commande', '/ticket',
  ],
  cuisinier: [
    '/cuisine',
  ],
  receptionniste: [
    '/hebergement', '/ventes', '/ventes/commande', '/ticket',
  ],
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  /** Rôles autorisés pour cette route. Si omis, tous les rôles authentifiés sont acceptés. */
  allowedRoles?: Role[]
  children: React.ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  // 1. Non authentifié → login (avec retour à la page demandée après connexion)
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const role = user.role as Role

  // 2. Rôles spécifiques requis → vérifier
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || '/login'} replace />
  }

  // 3. Vérification par chemin (protection fine)
  const allowed = ROLE_ALLOWED_ROUTES[role] || []
  const hasAccess = allowed.some((route) => location.pathname.startsWith(route))

  if (!hasAccess) {
    return <Navigate to={ROLE_HOME[role] || '/login'} replace />
  }

  return <>{children}</>
}
