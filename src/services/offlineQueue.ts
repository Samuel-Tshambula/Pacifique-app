/**
 * src/services/offlineQueue.ts
 *
 * ÉTAPE 8 — File d'attente hors ligne.
 *
 * Quand le serveur est indisponible, les actions (POST/PATCH) sont stockées
 * dans localStorage et rejouées automatiquement au retour en ligne.
 * Zéro perte de données — l'utilisateur peut continuer à travailler.
 *
 * Architecture :
 *   - Chaque action en attente est un QueuedAction sérialisable
 *   - La queue est persistée dans localStorage (survit aux rechargements)
 *   - Le flush est déclenché par l'événement 'online' du navigateur
 *   - Les actions sont rejouées dans l'ordre FIFO
 *   - En cas d'échec du replay, l'action reste en queue (retry au prochain flush)
 */

import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface QueuedAction {
  id: string
  method: HttpMethod
  url: string                    // URL relative (ex: /commandes)
  data?: unknown                 // Corps de la requête
  headers?: Record<string, string>
  enqueuedAt: string             // ISO timestamp
  attempts: number               // Nombre de tentatives
  maxAttempts: number            // Limite de tentatives (défaut: 5)
  label: string                  // Description lisible (ex: "Créer commande table 3")
}

export interface QueueStats {
  total: number
  pending: number
  failed: number
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pacifique_offline_queue'
const MAX_ATTEMPTS = 5
const MAX_QUEUE_SIZE = 200       // Limite de sécurité

// ─── Callbacks ────────────────────────────────────────────────────────────────

type QueueChangeCallback = (stats: QueueStats) => void
const listeners: QueueChangeCallback[] = []

export function onQueueChange(cb: QueueChangeCallback): () => void {
  listeners.push(cb)
  return () => {
    const idx = listeners.indexOf(cb)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}

function notifyListeners() {
  const stats = getQueueStats()
  listeners.forEach((cb) => cb(stats))
}

// ─── Persistance ──────────────────────────────────────────────────────────────

function loadQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as QueuedAction[]
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedAction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    notifyListeners()
  } catch (err) {
    console.warn('[OfflineQueue] Impossible de sauvegarder la queue :', (err as Error).message)
  }
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Ajoute une action à la file d'attente.
 * Appelé automatiquement par l'intercepteur Axios quand le serveur est indisponible.
 */
export function enqueue(
  method: HttpMethod,
  url: string,
  data?: unknown,
  label = 'Action en attente',
  headers?: Record<string, string>
): QueuedAction {
  const queue = loadQueue()

  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn('[OfflineQueue] Queue pleine — action ignorée')
    throw new Error('File d\'attente hors ligne pleine. Reconnectez-vous au serveur.')
  }

  const action: QueuedAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    url,
    data,
    headers,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    label,
  }

  queue.push(action)
  saveQueue(queue)
  console.log(`[OfflineQueue] Enqueued: ${method} ${url} — "${label}" (queue: ${queue.length})`)
  return action
}

/**
 * Retourne toutes les actions en attente.
 */
export function getQueue(): QueuedAction[] {
  return loadQueue()
}

/**
 * Retourne les statistiques de la queue.
 */
export function getQueueStats(): QueueStats {
  const queue = loadQueue()
  return {
    total: queue.length,
    pending: queue.filter((a) => a.attempts < a.maxAttempts).length,
    failed: queue.filter((a) => a.attempts >= a.maxAttempts).length,
  }
}

/**
 * Supprime une action de la queue par son id.
 */
export function removeFromQueue(id: string): void {
  const queue = loadQueue().filter((a) => a.id !== id)
  saveQueue(queue)
}

/**
 * Vide complètement la queue (actions réussies ou abandonnées).
 */
export function clearQueue(): void {
  saveQueue([])
  console.log('[OfflineQueue] Queue vidée')
}

/**
 * Supprime les actions qui ont dépassé le nombre max de tentatives.
 */
export function clearFailedActions(): void {
  const queue = loadQueue().filter((a) => a.attempts < a.maxAttempts)
  saveQueue(queue)
}

// ─── Flush (replay) ───────────────────────────────────────────────────────────

let isFlushing = false

/**
 * Rejoue toutes les actions en attente dans l'ordre FIFO.
 * Appelé automatiquement quand le navigateur repasse en ligne.
 * Ne bloque jamais l'UI — s'exécute en arrière-plan.
 *
 * @param baseUrl - URL de base de l'API (ex: http://localhost:3001/api)
 * @param token   - Token JWT pour l'authentification
 */
export async function flushQueue(baseUrl: string, token: string | null): Promise<{
  replayed: number
  failed: number
}> {
  if (isFlushing) {
    console.log('[OfflineQueue] Flush déjà en cours')
    return { replayed: 0, failed: 0 }
  }

  const queue = loadQueue()
  if (queue.length === 0) return { replayed: 0, failed: 0 }

  isFlushing = true
  console.log(`[OfflineQueue] Flush démarré — ${queue.length} action(s) en attente`)

  let replayed = 0
  let failed = 0

  for (const action of [...queue]) {
    if (action.attempts >= action.maxAttempts) {
      console.warn(`[OfflineQueue] Action abandonnée (${action.maxAttempts} tentatives) : ${action.label}`)
      failed++
      continue
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(action.headers || {}),
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      await axios({
        method: action.method,
        url: `${baseUrl}${action.url}`,
        data: action.data,
        headers,
        timeout: 15000,
      })

      removeFromQueue(action.id)
      replayed++
      console.log(`[OfflineQueue] ✓ Rejoué : ${action.method} ${action.url} — "${action.label}"`)
    } catch (err) {
      // Incrémenter le compteur de tentatives
      const currentQueue = loadQueue()
      const idx = currentQueue.findIndex((a) => a.id === action.id)
      if (idx !== -1) {
        currentQueue[idx].attempts++
        saveQueue(currentQueue)
      }
      failed++
      console.warn(`[OfflineQueue] ✗ Échec replay : ${action.label} —`, (err as Error).message)
    }
  }

  isFlushing = false
  console.log(`[OfflineQueue] Flush terminé — ${replayed} rejoué(s), ${failed} échoué(s)`)
  return { replayed, failed }
}
