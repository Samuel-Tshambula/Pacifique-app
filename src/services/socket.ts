/**
 * src/services/socket.ts
 * Client Socket.IO pour le renderer React.
 * Gère la connexion, la reconnexion automatique avec backoff exponentiel,
 * et expose l'instance singleton du socket.
 */

import { io, Socket } from 'socket.io-client'

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Résout l'URL du serveur Socket.IO.
 * Priorité : variable d'environnement Vite > valeur par défaut.
 */
function resolveServerUrl(): string {
  // En production Electron, l'URL peut être injectée via window.__SERVER_URL__
  if (typeof window !== 'undefined' && (window as any).__SERVER_URL__) {
    return (window as any).__SERVER_URL__
  }
  // Variable d'environnement Vite (définie dans .env ou vite.config.ts)
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL
  }
  // Fallback développement
  return 'http://localhost:3001'
}

// ─── Instance Socket (singleton) ──────────────────────────────────────────────

let socket: Socket | null = null

/**
 * Retourne l'instance Socket.IO (crée si inexistante).
 * Reconnexion automatique avec backoff exponentiel intégré.
 */
export function getSocket(): Socket {
  if (socket && socket.connected) return socket

  if (socket) {
    socket.disconnect()
    socket = null
  }

  const serverUrl = resolveServerUrl()

  socket = io(serverUrl, {
    // Reconnexion automatique
    reconnection: true,
    reconnectionAttempts: Infinity,   // Réessaie indéfiniment
    reconnectionDelay: 1000,          // Délai initial : 1s
    reconnectionDelayMax: 30000,      // Délai max : 30s (backoff exponentiel)
    randomizationFactor: 0.5,         // Jitter pour éviter les tempêtes de reconnexion

    // Transport : WebSocket en priorité, fallback polling
    transports: ['websocket', 'polling'],

    // Timeout de connexion
    timeout: 20000,

    // Authentification (token JWT depuis localStorage)
    auth: (cb) => {
      const token = localStorage.getItem('token')
      cb({ token: token || '' })
    },
  })

  // ── Logs de connexion ────────────────────────────────────────────────────
  socket.on('connect', () => {
    console.log('[Socket] ✓ Connecté au serveur :', serverUrl)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Déconnecté :', reason)
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Erreur de connexion :', err.message)
  })

  socket.on('reconnect', (attempt) => {
    console.log(`[Socket] ✓ Reconnecté après ${attempt} tentative(s)`)
  })

  socket.on('reconnect_attempt', (attempt) => {
    console.log(`[Socket] Tentative de reconnexion #${attempt}...`)
  })

  socket.on('reconnect_failed', () => {
    console.error('[Socket] ✗ Reconnexion échouée définitivement')
  })

  return socket
}

/**
 * Rejoint une salle Socket.IO selon le rôle utilisateur.
 * @param room - 'kitchen' | 'reception' | 'admin'
 */
export function joinRoom(room: string): void {
  const s = getSocket()
  s.emit('join_room', room)
  console.log(`[Socket] Salle rejointe : ${room}`)
}

/**
 * Déconnecte proprement le socket (ex: logout).
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('[Socket] Déconnecté manuellement')
  }
}

/**
 * Retourne l'état de connexion actuel.
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false
}

// Types
export interface OrderReadyPayload {
  commandeId: string
  table: string | number
  plats: Array<{
    nom: string
    quantite: number
  }>
  timestamp: string
}
