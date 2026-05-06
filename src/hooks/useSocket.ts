/**
 * src/hooks/useSocket.ts
 *
 * ÉTAPE 7 — Reconnexion automatique avec backoff exponentiel.
 * - Statut visible : connected / connecting / disconnected / error
 * - Compteur de tentatives exposé pour l'UI
 * - Retry manuel via reconnect()
 * - UI jamais bloquée (état asynchrone, pas de throw)
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSocket, joinRoom, disconnectSocket, isSocketConnected } from '../services/socket'
import { useAuthStore } from '../store/authStore'
import type { Socket } from 'socket.io-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

/** Mapping rôle utilisateur → salle Socket.IO */
const ROLE_TO_ROOM: Record<string, string> = {
  cuisinier:      'kitchen',
  admin:          'admin',
  gestionnaire:   'admin',
  serveur:        'reception',
  receptionniste: 'reception',
  comptable:      'admin',
}

interface UseSocketReturn {
  socket: Socket | null
  status: SocketStatus
  isConnected: boolean
  reconnectAttempts: number
  reconnect: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSocket(): UseSocketReturn {
  const { user, isAuthenticated } = useAuthStore()
  const [status, setStatus] = useState<SocketStatus>(
    isSocketConnected() ? 'connected' : 'disconnected'
  )
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const socketRef = useRef<Socket | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) return

    setStatus('connecting')

    const s = getSocket()
    socketRef.current = s

    const room = ROLE_TO_ROOM[user.role] || 'reception'

    // Si déjà connecté, rejoindre la salle directement
    if (s.connected) {
      joinRoom(room)
      setStatus('connected')
      setReconnectAttempts(0)
    } else {
      s.once('connect', () => {
        joinRoom(room)
        setStatus('connected')
        setReconnectAttempts(0)
      })
    }

    // ── Listeners de statut ──────────────────────────────────────────────
    const onConnect = () => {
      setStatus('connected')
      setReconnectAttempts(0)
      joinRoom(room) // Re-rejoindre la salle après reconnexion
    }

    const onDisconnect = (reason: string) => {
      // Si la déconnexion est volontaire (logout), ne pas passer en "disconnected"
      // socket.io-client passe reason = "io client disconnect" dans ce cas
      if (reason === 'io client disconnect') return
      setStatus('disconnected')
    }

    const onConnectError = () => {
      setStatus('error')
    }

    // Backoff exponentiel : socket.io-client le gère nativement
    // (reconnectionDelay + reconnectionDelayMax dans socket.ts)
    // On expose juste le compteur pour l'UI
    const onReconnectAttempt = (attempt: number) => {
      setStatus('connecting')
      setReconnectAttempts(attempt)
    }

    const onReconnect = () => {
      setStatus('connected')
      setReconnectAttempts(0)
    }

    const onReconnectFailed = () => {
      setStatus('error')
    }

    s.on('connect',            onConnect)
    s.on('disconnect',         onDisconnect)
    s.on('connect_error',      onConnectError)
    s.on('reconnect_attempt',  onReconnectAttempt)
    s.on('reconnect',          onReconnect)
    s.on('reconnect_failed',   onReconnectFailed)

    // Cleanup : retirer les listeners sans déconnecter le socket
    cleanupRef.current = () => {
      s.off('connect',           onConnect)
      s.off('disconnect',        onDisconnect)
      s.off('connect_error',     onConnectError)
      s.off('reconnect_attempt', onReconnectAttempt)
      s.off('reconnect',         onReconnect)
      s.off('reconnect_failed',  onReconnectFailed)
    }
  }, [isAuthenticated, user])

  // Connexion au montage / changement d'utilisateur
  useEffect(() => {
    connect()
    return () => {
      cleanupRef.current?.()
    }
  }, [connect])

  // Déconnexion au logout
  useEffect(() => {
    if (!isAuthenticated) {
      cleanupRef.current?.()
      disconnectSocket()
      setStatus('disconnected')
      setReconnectAttempts(0)
      socketRef.current = null
    }
  }, [isAuthenticated])

  // Retry manuel : force une nouvelle connexion
  const reconnect = useCallback(() => {
    cleanupRef.current?.()
    disconnectSocket()
    socketRef.current = null
    setReconnectAttempts(0)
    connect()
  }, [connect])

  return {
    socket: socketRef.current,
    status,
    isConnected: status === 'connected',
    reconnectAttempts,
    reconnect,
  }
}
