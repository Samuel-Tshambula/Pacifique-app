/**
 * src/hooks/useNotificationsPlats.ts
 * Notifications temps réel pour les commandes prêtes.
 * Utilise Socket.IO (événement order_ready) en priorité.
 * Fallback sur polling HTTP si Socket.IO non disponible.
 */

import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { getSocket } from '../services/socket'
import { useAuthStore } from '../store/authStore'
import type { OrderReadyPayload } from '../services/socket'

// Rôles qui reçoivent les alertes "commande prête"
const ROLES_ALERTES = ['serveur', 'admin', 'gestionnaire', 'receptionniste']

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.15, 0.3].forEach((t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.12)
    })
  } catch {
    // AudioContext non disponible (ex: navigateur sans interaction utilisateur)
  }
}

function showOrderReadyToast(tableNumero: number) {
  playNotificationSound()
  toast(`Table ${tableNumero} — Commande prête à servir !`, {
    duration: 12000,
    style: {
      background: '#f0fdf4',
      border: '2px solid #22c55e',
      color: '#15803d',
      fontWeight: '600',
      fontSize: '15px',
      padding: '14px 18px',
    },
    icon: '🔔',
  })
}

export function useNotificationsPlats(setBadgeCount: (n: number) => void) {
  const { user } = useAuthStore()
  const commandesPretes = useRef<Set<string>>(new Set())
  const socketListenerAttached = useRef(false)

  useEffect(() => {
    if (!user || !ROLES_ALERTES.includes(user.role)) return

    // ── Écoute Socket.IO (temps réel) ────────────────────────────────────────
    const socket = getSocket()

    if (!socketListenerAttached.current) {
      socket.on('order_ready', (payload: OrderReadyPayload) => {
        if (!commandesPretes.current.has(payload.commandeId)) {
          commandesPretes.current.add(payload.commandeId)
          showOrderReadyToast(payload.tableNumero)
          // Incrémenter le badge (sera recalculé par le polling aussi)
          setBadgeCount((prev: number) => prev + 1)
        }
      })
      socketListenerAttached.current = true
    }

    // ── Polling HTTP (fallback + comptage badge) ──────────────────────────────
    async function checkCommandes() {
      try {
        const { data } = await api.get('/commandes')
        const pretes: any[] = data.filter((c: any) =>
          c.statut === 'prete' ||
          (c.statut === 'en_cours' && c.lignes.every((l: any) =>
            l.statut === 'pret' || l.statut === 'servi'
          ))
        )

        // Nouvelles commandes prêtes non encore notifiées (fallback si Socket.IO manqué)
        pretes
          .filter((c) => !commandesPretes.current.has(c.id))
          .forEach((c) => {
            commandesPretes.current.add(c.id)
            showOrderReadyToast(c.tableNumero)
          })

        // Nettoyer les commandes payées du Set
        const idsPretes = new Set(pretes.map((c) => c.id))
        commandesPretes.current.forEach((id) => {
          if (!idsPretes.has(id)) commandesPretes.current.delete(id)
        })

        setBadgeCount(pretes.length)
      } catch {
        // Silencieux — le serveur peut être temporairement indisponible
      }
    }

    checkCommandes()
    const interval = setInterval(checkCommandes, 10000) // Réduit à 10s (Socket.IO gère le temps réel)

    return () => {
      clearInterval(interval)
      socket.off('order_ready')
      socketListenerAttached.current = false
    }
  }, [user])
}

// Réexport du type pour les consommateurs
export type { OrderReadyPayload }
