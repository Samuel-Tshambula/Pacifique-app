/**
 * src/hooks/useOnlineStatus.ts
 *
 * ÉTAPE 8 — Détecte le statut réseau (online/offline) et déclenche
 * automatiquement le flush de la queue hors ligne au retour en ligne.
 *
 * Utilise les événements natifs du navigateur : window.online / window.offline
 * + un ping HTTP périodique pour détecter les cas où le navigateur dit "online"
 * mais le serveur est en fait inaccessible (réseau LAN coupé).
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { flushQueue, getQueueStats, onQueueChange, type QueueStats } from '../services/offlineQueue'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnlineStatus {
  isOnline: boolean          // Navigateur ET serveur accessibles
  isBrowserOnline: boolean   // Navigateur seul (navigator.onLine)
  isServerReachable: boolean // Serveur API accessible (ping)
  queueStats: QueueStats
  isFlushing: boolean
  flushNow: () => Promise<void>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveApiBase(): string {
  if (typeof window !== 'undefined' && (window as any).__SERVER_URL__) {
    return `${(window as any).__SERVER_URL__}/api`
  }
  if (import.meta.env.VITE_SERVER_URL) {
    return `${import.meta.env.VITE_SERVER_URL}/api`
  }
  return 'http://localhost:3001/api'
}

async function pingServer(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    return res.ok
  } catch {
    return false
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOnlineStatus(): OnlineStatus {
  const { token } = useAuthStore()
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine)
  const [isServerReachable, setIsServerReachable] = useState(true)
  const [queueStats, setQueueStats] = useState<QueueStats>(getQueueStats())
  const [isFlushing, setIsFlushing] = useState(false)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wasOfflineRef = useRef(false)

  const apiBase = resolveApiBase()

  // ── Flush de la queue ──────────────────────────────────────────────────────
  const flushNow = useCallback(async () => {
    if (isFlushing) return
    setIsFlushing(true)
    try {
      const result = await flushQueue(apiBase, token)
      if (result.replayed > 0) {
        toast.success(`${result.replayed} action(s) synchronisée(s) avec le serveur`, {
          duration: 5000,
          icon: '🔄',
        })
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} action(s) n'ont pas pu être synchronisées`, {
          duration: 6000,
        })
      }
    } finally {
      setIsFlushing(false)
    }
  }, [apiBase, token, isFlushing])

  // ── Ping périodique du serveur ─────────────────────────────────────────────
  const checkServer = useCallback(async () => {
    if (!navigator.onLine) {
      setIsServerReachable(false)
      return
    }
    const reachable = await pingServer(apiBase)
    setIsServerReachable(reachable)

    // Retour en ligne détecté → flush automatique
    if (reachable && wasOfflineRef.current) {
      wasOfflineRef.current = false
      console.log('[OnlineStatus] Retour en ligne — flush de la queue...')
      toast('Connexion rétablie — synchronisation en cours...', {
        icon: '🌐',
        duration: 4000,
        style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' },
      })
      await flushNow()
    } else if (!reachable && !wasOfflineRef.current) {
      wasOfflineRef.current = true
      toast('Serveur inaccessible — mode hors ligne activé', {
        icon: '📴',
        duration: 5000,
        style: { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' },
      })
    }
  }, [apiBase, flushNow])

  // ── Événements navigateur ──────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true)
      checkServer()
    }
    const handleOffline = () => {
      setIsBrowserOnline(false)
      setIsServerReachable(false)
      wasOfflineRef.current = true
      toast('Connexion réseau perdue — mode hors ligne', {
        icon: '📴',
        duration: 5000,
        style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Ping initial
    checkServer()

    // Ping toutes les 30 secondes
    pingIntervalRef.current = setInterval(checkServer, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
    }
  }, [checkServer])

  // ── Écouter les changements de queue ──────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onQueueChange(setQueueStats)
    return unsubscribe
  }, [])

  const isOnline = isBrowserOnline && isServerReachable

  return {
    isOnline,
    isBrowserOnline,
    isServerReachable,
    queueStats,
    isFlushing,
    flushNow,
  }
}
