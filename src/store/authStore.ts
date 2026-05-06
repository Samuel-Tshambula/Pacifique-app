/**
 * src/store/authStore.ts
 *
 * ÉTAPE 6 — La redirection post-login est basée uniquement sur le rôle
 *            utilisateur retourné par l'API. config.json n'intervient pas.
 * ÉTAPE 7 — Déconnexion Socket.IO propre au logout.
 */

import { create } from 'zustand'
import type { AuthState, User } from '../types'
import api from '../services/api'
import { disconnectSocket } from '../services/socket'

// ─── Timeout d'inactivité ─────────────────────────────────────────────────────

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes
let inactivityTimer: ReturnType<typeof setTimeout> | null = null
let activityListenersAttached = false

function resetInactivityTimer(logout: () => void) {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(() => {
    console.log('[Auth] Session expirée par inactivité')
    logout()
  }, INACTIVITY_TIMEOUT)
}

function attachActivityListeners(logout: () => void) {
  if (activityListenersAttached) return
  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
  const handler = () => resetInactivityTimer(logout)
  events.forEach((e) => window.addEventListener(e, handler, { passive: true }))
  activityListenersAttached = true
}

function detachActivityListeners() {
  // Les listeners sont passifs et peu coûteux — on les laisse en place
  // mais on annule le timer pour éviter le logout après déconnexion
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
    inactivityTimer = null
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user:            JSON.parse(localStorage.getItem('user') || 'null'),
  token:           localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  /**
   * Login : appelle l'API, stocke le token, retourne le rôle.
   * La redirection est gérée par le composant appelant (Login.tsx)
   * basée uniquement sur data.user.role — jamais sur config.json.
   */
  login: async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password })

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    set({ user: data.user as User, token: data.token, isAuthenticated: true })

    // Démarrer le timer d'inactivité
    resetInactivityTimer(get().logout)
    attachActivityListeners(get().logout)

    return data.user.role as string
  },

  /**
   * Logout : nettoie tout proprement.
   * - Supprime le token et l'utilisateur du localStorage
   * - Déconnecte Socket.IO
   * - Annule le timer d'inactivité
   */
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    // Déconnecter Socket.IO proprement (Étape 7)
    disconnectSocket()

    // Annuler le timer d'inactivité
    detachActivityListeners()

    set({ user: null, token: null, isAuthenticated: false })
  },
}))
