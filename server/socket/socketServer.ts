/**
 * socketServer.ts
 * Initialise et gère le serveur Socket.IO.
 * Implémente les événements temps réel : new_order, order_update, order_ready.
 * Ce module est uniquement chargé si role = "server" dans config.json.
 */

import { Server as SocketIOServer, Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'

// ─── Types des événements ────────────────────────────────────────────────────

export interface OrderPayload {
  commandeId: string
  tableNumero: number
  serveurNom: string
  lignes: {
    produitNom: string
    quantite: number
    notes?: string
  }[]
  total: number
  createdAt: string
}

export interface OrderUpdatePayload {
  commandeId: string
  ligneId?: string
  statut: 'en_attente' | 'en_preparation' | 'pret' | 'servi' | 'prete' | 'payee' | 'annulee'
  updatedAt: string
}

export interface OrderReadyPayload {
  commandeId: string
  tableNumero: number
  updatedAt: string
}

// ─── Initialisation ──────────────────────────────────────────────────────────

let io: SocketIOServer | null = null

/**
 * Attache Socket.IO à un serveur HTTP existant.
 * @param httpServer - Instance du serveur HTTP Express
 * @param allowedOrigins - Liste des origines autorisées (CORS)
 */
export function initSocketServer(
  httpServer: HttpServer,
  allowedOrigins: string[] = ['http://localhost:5173', 'http://localhost:3001']
): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Reconnexion côté serveur : ping toutes les 25s, timeout 60s
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connecté : ${socket.id}`)

    // ── Rejoindre une salle selon le rôle ──────────────────────────────────
    socket.on('join_room', (room: string) => {
      socket.join(room)
      console.log(`[Socket.IO] ${socket.id} a rejoint la salle : ${room}`)
    })

    // ── Nouvelle commande (serveur → cuisine) ──────────────────────────────
    socket.on('new_order', (payload: OrderPayload, ack?: (res: { ok: boolean }) => void) => {
      console.log(`[Socket.IO] new_order — Table ${payload.tableNumero}`)

      // Diffuser à la cuisine
      socket.to('kitchen').emit('new_order', payload)
      // Diffuser aux admins/gestionnaires
      socket.to('admin').emit('new_order', payload)

      // Confirmation (acknowledgement)
      if (typeof ack === 'function') {
        ack({ ok: true })
      }
    })

    // ── Mise à jour statut commande/ligne (cuisine → serveur) ──────────────
    socket.on('order_update', (payload: OrderUpdatePayload, ack?: (res: { ok: boolean }) => void) => {
      console.log(`[Socket.IO] order_update — Commande ${payload.commandeId} → ${payload.statut}`)

      // Diffuser à tous les serveurs et admins
      socket.to('reception').emit('order_update', payload)
      socket.to('admin').emit('order_update', payload)

      if (typeof ack === 'function') {
        ack({ ok: true })
      }
    })

    // ── Commande prête (cuisine → salle) ──────────────────────────────────
    socket.on('order_ready', (payload: OrderReadyPayload, ack?: (res: { ok: boolean }) => void) => {
      console.log(`[Socket.IO] order_ready — Table ${payload.tableNumero}`)

      // Diffuser à la réception et aux serveurs
      socket.to('reception').emit('order_ready', payload)
      socket.to('admin').emit('order_ready', payload)

      if (typeof ack === 'function') {
        ack({ ok: true })
      }
    })

    // ── Déconnexion ────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client déconnecté : ${socket.id} (${reason})`)
    })

    socket.on('error', (err) => {
      console.error(`[Socket.IO] Erreur socket ${socket.id} :`, err.message)
    })
  })

  console.log('[Socket.IO] Serveur initialisé')
  return io
}

/**
 * Émet un événement depuis le serveur vers une salle (usage interne).
 * Permet aux routes Express d'émettre des événements Socket.IO.
 */
export function emitToRoom(room: string, event: string, data: unknown): void {
  if (!io) {
    console.warn('[Socket.IO] Tentative d\'émission avant initialisation')
    return
  }
  io.to(room).emit(event, data)
}

/**
 * Émet un événement à tous les clients connectés.
 */
export function broadcast(event: string, data: unknown): void {
  if (!io) {
    console.warn('[Socket.IO] Tentative de broadcast avant initialisation')
    return
  }
  io.emit(event, data)
}

/**
 * Retourne l'instance Socket.IO (peut être null si non initialisé).
 */
export function getIO(): SocketIOServer | null {
  return io
}
