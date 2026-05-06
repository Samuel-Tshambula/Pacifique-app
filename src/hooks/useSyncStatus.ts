/**
 * src/hooks/useSyncStatus.ts
 *
 * ÉTAPE 9 — Expose le statut de synchronisation cloud au frontend.
 * Interroge /api/sync/status périodiquement et permet de déclencher
 * une sync manuelle depuis l'UI.
 */

import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncStatus {
  mongodb: boolean        // MongoDB Atlas connecté
  lastSync: string | null // ISO timestamp de la dernière sync
  isSyncing: boolean      // Sync en cours
  error: string | null
}

export interface UseSyncStatusReturn {
  status: SyncStatus
  syncNow: () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSyncStatus(pollIntervalMs = 60000): UseSyncStatusReturn {
  const { isAuthenticated } = useAuthStore()
  const [status, setStatus] = useState<SyncStatus>({
    mongodb: false,
    lastSync: null,
    isSyncing: false,
    error: null,
  })

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const { data } = await api.get('/sync/status')
      setStatus((prev) => ({
        ...prev,
        mongodb: data.mongodb,
        lastSync: data.lastSync,
        error: null,
      }))
    } catch {
      // Silencieux — le serveur peut être temporairement indisponible
    }
  }, [isAuthenticated])

  // Polling du statut
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, pollIntervalMs)
    return () => clearInterval(interval)
  }, [fetchStatus, pollIntervalMs])

  // Sync manuelle déclenchée depuis l'UI
  const syncNow = useCallback(async () => {
    if (status.isSyncing) return
    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }))
    try {
      await api.post('/sync')
      await fetchStatus()
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        error: (err as any)?.response?.data?.message || 'Erreur de synchronisation',
      }))
    } finally {
      setStatus((prev) => ({ ...prev, isSyncing: false }))
    }
  }, [status.isSyncing, fetchStatus])

  return { status, syncNow }
}
