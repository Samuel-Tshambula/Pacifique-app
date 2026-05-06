/**
 * server/index.ts
 * Point d'entrée du serveur Express + Socket.IO.
 *
 * ÉTAPE 3 — Sécurité : toutes les variables sensibles viennent du .env,
 *            validées au démarrage via config/env.ts. Aucun fallback hardcodé.
 *
 * ÉTAPE 4 — Serveur conditionnel : démarre uniquement si role = "server"
 *            dans config.json. En mode "client", s'arrête proprement.
 */

import http from 'http'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { loadEnv, assertEnv, getMongoUri, getPort, isDev } from '../config/env.js'
import { loadConfig } from '../config/configManager.js'
import { initSocketServer } from './socket/socketServer.js'
import { startPeriodicSync } from '../sync/syncEngine.js'
import authRoutes from './routes/auth.js'
import tablesRoutes from './routes/tables.js'
import produitsRoutes from './routes/produits.js'
import commandesRoutes from './routes/commandes.js'
import utilisateursRoutes from './routes/utilisateurs.js'
import stockRoutes from './routes/stock.js'
import hebergementRoutes from './routes/hebergement.js'
import dashboardRoutes from './routes/dashboard.js'
import rapportsRoutes from './routes/rapports.js'

// ─── 1. Charger et valider l'environnement en premier ────────────────────────
loadEnv()
assertEnv()

// ─── 2. Charger la configuration runtime ─────────────────────────────────────
const appConfig = loadConfig()

// ─── 3. Démarrage conditionnel ────────────────────────────────────────────────
// Si role = "client" : ce process ne doit pas héberger de serveur.
// On log et on sort proprement. Le client se connectera à appConfig.serverUrl.
if (appConfig.role !== 'server') {
  console.log('[Server] Rôle "client" — serveur non démarré sur cette machine.')
  console.log(`[Server] Ce client se connectera à : ${appConfig.serverUrl}`)
  process.exit(0)
}

// ─── 4. Application Express ───────────────────────────────────────────────────
const app = express()
const PORT = getPort()

// Origines CORS autorisées : Vite dev + URL du serveur configurée
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  `http://localhost:${PORT}`,
  appConfig.serverUrl,
].filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i)

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }))
app.use(express.json({ limit: '10mb' }))

// ─── 5. Routes API ────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/tables',       tablesRoutes)
app.use('/api/produits',     produitsRoutes)
app.use('/api/commandes',    commandesRoutes)
app.use('/api/utilisateurs', utilisateursRoutes)
app.use('/api/stock',        stockRoutes)
app.use('/api/hebergement',  hebergementRoutes)
app.use('/api/dashboard',    dashboardRoutes)
app.use('/api/rapports',     rapportsRoutes)

// ─── 6. Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    role: appConfig.role,
    screen: appConfig.screen,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: isDev() ? 'development' : 'production',
    timestamp: new Date().toISOString(),
  })
})

// ─── 7. Sync manuelle ─────────────────────────────────────────────────────────
app.post('/api/sync', async (_req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'MongoDB non connecté — mode offline' })
  }
  try {
    const result = await syncBidirectional()
    res.json({ ...result, message: 'Synchronisation terminée' })
  } catch (error) {
    res.status(500).json({ message: 'Erreur sync', error: (error as Error).message })
  }
})

app.get('/api/sync/status', (_req, res) => {
  res.json({
    mongodb: mongoose.connection.readyState === 1,
    lastSync: getLastSyncAt(),
    isSyncing: isSyncInProgress(),
    logs: getSyncLogs().slice(-20),
  })
})

// ─── 8. Serveur HTTP + Socket.IO ──────────────────────────────────────────────
const httpServer = http.createServer(app)
initSocketServer(httpServer, ALLOWED_ORIGINS)

httpServer.listen(PORT, () => {
  console.log(`[Server] ✓ Express + Socket.IO démarré sur le port ${PORT}`)
  console.log(`[Server]   Rôle : ${appConfig.role} | Écran : ${appConfig.screen}`)
  console.log(`[Server]   Origines CORS : ${ALLOWED_ORIGINS.join(', ')}`)
})

// ─── 9. Connexion MongoDB Atlas (arrière-plan, non bloquante) ─────────────────
const mongoUri = getMongoUri()

if (!mongoUri) {
  console.log('[MongoDB] Mode offline — MONGODB_URI non configurée')
} else {
  mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
    })
    .then(() => {
      console.log('[MongoDB] ✓ Connecté à MongoDB Atlas')
      startPeriodicSync()
    })
    .catch((err: Error) => {
      console.warn('[MongoDB] ✗ Connexion échouée — mode offline :', err.message)
    })
}

// ─── Import différé pour éviter la référence circulaire ──────────────────────
import { syncToCloud, syncFromCloud, syncBidirectional, getLastSyncAt, getSyncLogs, isSyncInProgress } from '../sync/syncEngine.js'

export default app
