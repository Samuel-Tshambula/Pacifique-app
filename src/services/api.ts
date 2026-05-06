/**
 * src/services/api.ts
 *
 * ÉTAPE 8 — Intercepteur hors ligne :
 *   Si le serveur est indisponible lors d'une mutation (POST/PATCH/PUT/DELETE),
 *   l'action est mise en queue locale au lieu d'être rejetée.
 *   Les GET échouent normalement (pas de sens de les mettre en queue).
 *
 * L'URL de base est résolue dynamiquement — aucune valeur codée en dur.
 */

import axios, { type AxiosRequestConfig } from 'axios'
import { enqueue, type HttpMethod } from './offlineQueue'

// ─── Résolution de l'URL de base ──────────────────────────────────────────────

function resolveBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as any).__SERVER_URL__) {
    return `${(window as any).__SERVER_URL__}/api`
  }
  if (import.meta.env.VITE_SERVER_URL) {
    return `${import.meta.env.VITE_SERVER_URL}/api`
  }
  return 'http://localhost:3001/api'
}

// ─── Instance Axios ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15000,
})

// ─── Intercepteur requête : injection du token JWT ────────────────────────────

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Intercepteur réponse : hors ligne + erreurs globales ────────────────────

api.interceptors.response.use(
  (res) => res,

  async (err) => {
    const config: AxiosRequestConfig & { _queued?: boolean } = err.config || {}
    const method = (config.method?.toUpperCase() || 'GET') as HttpMethod
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

    // ── Serveur inaccessible (réseau LAN coupé, serveur arrêté) ─────────────
    const isNetworkError =
      !err.response &&
      (err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNREFUSED' ||
        err.code === 'ECONNABORTED' ||
        err.message?.includes('Network Error'))

    if (isNetworkError && isMutation && !config._queued) {
      // Marquer pour éviter la double mise en queue
      config._queued = true

      const url = config.url || ''
      const label = buildLabel(method, url, config.data)

      try {
        enqueue(method, url, config.data, label)
        console.log(`[API] Action mise en queue hors ligne : ${method} ${url}`)

        // Retourner une réponse "virtuelle" pour ne pas bloquer l'UI
        return Promise.resolve({
          data: { _offline: true, message: 'Action enregistrée hors ligne' },
          status: 202,
          statusText: 'Queued',
          headers: {},
          config,
        })
      } catch (queueErr) {
        return Promise.reject(queueErr)
      }
    }

    // ── Token expiré ou invalide → déconnexion automatique ──────────────────
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.hash = '/login'
    }

    return Promise.reject(err)
  }
)

// ─── Helper : label lisible pour la queue ─────────────────────────────────────

function buildLabel(method: HttpMethod, url: string, data: unknown): string {
  const labels: Record<string, string> = {
    '/commandes':  'Créer commande',
    '/payer':      'Payer commande',
    '/annuler':    'Annuler commande',
    '/lignes':     'Mettre à jour plat',
    '/hebergement/sejours': 'Enregistrer séjour',
    '/stock':      'Mettre à jour stock',
  }

  for (const [key, label] of Object.entries(labels)) {
    if (url.includes(key)) {
      const tableNum = (data as any)?.tableNumero
      return tableNum ? `${label} (table ${tableNum})` : label
    }
  }

  return `${method} ${url}`
}

export default api
