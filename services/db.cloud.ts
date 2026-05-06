/**
 * services/db.cloud.ts
 * Gestion de la connexion MongoDB Atlas.
 * Fournit des helpers pour vérifier l'état de la connexion
 * et déclencher des opérations cloud de manière sécurisée.
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

// ─── État de la connexion ─────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

let _status: ConnectionStatus = 'disconnected'
let _lastError: string | null = null

export function getConnectionStatus(): ConnectionStatus {
  return _status
}

export function getLastError(): string | null {
  return _lastError
}

/**
 * Retourne true si MongoDB Atlas est connecté et opérationnel.
 */
export function isCloudAvailable(): boolean {
  return mongoose.connection.readyState === 1
}

// ─── Connexion ────────────────────────────────────────────────────────────────

/**
 * Tente de se connecter à MongoDB Atlas.
 * Ne lève jamais d'exception — retourne false en cas d'échec.
 * Conçu pour être appelé en arrière-plan sans bloquer l'app.
 */
export async function connectCloud(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI

  // Vérification : URI configurée et non par défaut
  if (!mongoUri || mongoUri.includes('username:password')) {
    console.log('[DB Cloud] MONGODB_URI non configuré — mode offline')
    _status = 'disconnected'
    return false
  }

  if (mongoose.connection.readyState === 1) {
    _status = 'connected'
    return true
  }

  _status = 'connecting'
  console.log('[DB Cloud] Connexion à MongoDB Atlas...')

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // 10s max pour la sélection du serveur
      connectTimeoutMS: 15000,         // 15s max pour la connexion
    })
    _status = 'connected'
    _lastError = null
    console.log('[DB Cloud] ✓ Connecté à MongoDB Atlas')
    return true
  } catch (error) {
    _status = 'error'
    _lastError = (error as Error).message
    console.warn('[DB Cloud] ✗ Connexion échouée :', _lastError)
    return false
  }
}

/**
 * Ferme proprement la connexion MongoDB.
 */
export async function disconnectCloud(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
    _status = 'disconnected'
    console.log('[DB Cloud] Déconnecté de MongoDB Atlas')
  }
}

// ─── Événements Mongoose ──────────────────────────────────────────────────────

mongoose.connection.on('connected', () => {
  _status = 'connected'
  console.log('[DB Cloud] Événement : connecté')
})

mongoose.connection.on('disconnected', () => {
  _status = 'disconnected'
  console.log('[DB Cloud] Événement : déconnecté')
})

mongoose.connection.on('error', (err) => {
  _status = 'error'
  _lastError = err.message
  console.error('[DB Cloud] Événement erreur :', err.message)
})
