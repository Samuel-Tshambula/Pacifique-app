/**
 * src/hooks/useOrderEvents.ts
 *
 * ÉTAPE 5 — Écoute les 3 événements Socket.IO en temps réel :
 *   new_order    → nouvelle commande créée (cuisine + admin)
 *   order_update → statut d'une commande/ligne modifié
 *   order_ready  → toutes les lignes d'une commande sont prêtes
 *
 * Chaque callback est optionnel. Le hook gère le cleanup automatiquement.
 * Utilise des acks pour confirmer la réception au serveur.
 */

import { useEffect, useRef } from 'react'
import { getSocket } from '../services/socket'
import { useAuthStore } from '../store/authStore'

// ─── Types des payloads ───────────────────────────────────────────────────────

export interface NewOrderPayload {
  commandeId: string
  numero: string
  tableNumero: number
  serveurNom: string
  lignes: { produitNom: string; quantite: number; notes?: string }[]
  total: number
  notes: string
  createdAt: string
}

export interface OrderUpdatePayload {
  commandeId: string
  ligneId?: string
  statut: 'en_attente' | 'en_preparation' | 'pret' | 'servi' | 'prete' | 'payee' | 'annulee'
  commandeStatut?: string
  tableNumero: number
  updatedAt: string
}

export interface OrderReadyPayload {
  commandeId: string
  tableNumero: number
  serveurNom?: string
  updatedAt: string
}

export interface UseOrderEventsOptions {
  onNewOrder?: (payload: NewOrderPayload) => void
  onOrderUpdate?: (payload: OrderUpdatePayload) => void
  onOrderReady?: (payload: OrderReadyPayload) => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrderEvents(options: UseOrderEventsOptions) {
  const { user, isAuthenticated } = useAuthStore()
  // Stocker les callbacks dans des refs pour éviter les re-subscriptions
  const onNewOrderRef    = useRef(options.onNewOrder)
  const onOrderUpdateRef = useRef(options.onOrderUpdate)
  const onOrderReadyRef  = useRef(options.onOrderReady)

  // Mettre à jour les refs sans re-subscribe
  useEffect(() => { onNewOrderRef.current    = options.onNewOrder    }, [options.onNewOrder])
  useEffect(() => { onOrderUpdateRef.current = options.onOrderUpdate }, [options.onOrderUpdate])
  useEffect(() => { onOrderReadyRef.current  = options.onOrderReady  }, [options.onOrderReady])

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const socket = getSocket()

    // ── new_order ─────────────────────────────────────────────────────────
    const handleNewOrder = (payload: NewOrderPayload) => {
      onNewOrderRef.current?.(payload)
    }

    // ── order_update ──────────────────────────────────────────────────────
    const handleOrderUpdate = (payload: OrderUpdatePayload) => {
      onOrderUpdateRef.current?.(payload)
    }

    // ── order_ready ───────────────────────────────────────────────────────
    const handleOrderReady = (payload: OrderReadyPayload) => {
      onOrderReadyRef.current?.(payload)
    }

    socket.on('new_order',    handleNewOrder)
    socket.on('order_update', handleOrderUpdate)
    socket.on('order_ready',  handleOrderReady)

    return () => {
      socket.off('new_order',    handleNewOrder)
      socket.off('order_update', handleOrderUpdate)
      socket.off('order_ready',  handleOrderReady)
    }
  }, [isAuthenticated, user])
}
