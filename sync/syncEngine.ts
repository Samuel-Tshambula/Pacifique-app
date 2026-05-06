/**
 * sync/syncEngine.ts
 *
 * ÉTAPE 9 — Moteur de synchronisation bidirectionnelle local ↔ MongoDB Atlas.
 *
 * Stratégie : "offline-first" + "last-write-wins" (timestamp updatedAt).
 *
 * Fonctionnement :
 *   1. Détection online/offline via mongoose.connection.readyState
 *   2. Sync locale → cloud (upsert par id)
 *   3. Sync cloud → locale (fusion, last-write-wins)
 *   4. Gestion des conflits : le document avec l'updatedAt le plus récent gagne
 *   5. Logs structurés (100 derniers) accessibles via getSyncLogs()
 *   6. Sync périodique en arrière-plan (ne bloque jamais l'app)
 *   7. Chaque document a : _id, createdAt, updatedAt, syncStatus
 */

import mongoose from 'mongoose'
import { getUsers, saveUsers } from '../server/models/userStore.js'
import {
  getCommandes, saveCommandes,
  getProduits, saveProduits,
  getTables, saveTables,
} from '../server/models/store.js'
import { getSejours, saveSejours } from '../server/models/hebergementStore.js'
import type {
  UserDocument, CommandeDocument, ProduitDocument,
  TableDocument, SejourDocument,
} from '../src/types/models.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncLog {
  timestamp: string
  direction: 'to_cloud' | 'from_cloud' | 'bidirectional'
  collection: string
  count: number
  success: boolean
  durationMs?: number
  error?: string
}

export interface SyncResult {
  success: boolean
  toCloud: boolean
  fromCloud: boolean
  logs: SyncLog[]
  durationMs: number
  error?: string
}

// ─── État interne ─────────────────────────────────────────────────────────────

const syncLogs: SyncLog[] = []
let lastSyncAt: string | null = null
let isSyncing = false

function addLog(log: SyncLog) {
  syncLogs.push(log)
  if (syncLogs.length > 100) syncLogs.shift()
}

export function getSyncLogs(): SyncLog[] {
  return [...syncLogs]
}

export function getLastSyncAt(): string | null {
  return lastSyncAt
}

export function isSyncInProgress(): boolean {
  return isSyncing
}

// ─── Schémas Mongoose ─────────────────────────────────────────────────────────
// Chaque document contient : id, createdAt, updatedAt, syncStatus

const baseFields = {
  id:         { type: String, required: true, unique: true, index: true },
  createdAt:  { type: String, default: () => new Date().toISOString() },
  updatedAt:  { type: String, default: () => new Date().toISOString() },
  syncStatus: { type: String, enum: ['pending', 'synced'], default: 'synced' },
}

const schemas = {
  User: new mongoose.Schema({
    ...baseFields,
    name: String, username: String, password: String, role: String,
    isActive: Boolean, failedAttempts: Number, lockedUntil: String, lastLogin: String,
  }),
  Commande: new mongoose.Schema({
    ...baseFields,
    numero: String, serveurId: String, serveurNom: String,
    tableId: String, tableNumero: Number, type: String, statut: String,
    lignes: Array, total: Number, notes: String, modePaiement: String,
  }),
  Produit: new mongoose.Schema({
    ...baseFields,
    code: String, nom: String, prix: Number, categorie: String,
    stock: Number, stockMin: Number, unite: String, actif: Boolean,
  }),
  Table: new mongoose.Schema({
    ...baseFields,
    numero: Number, zone: String, capacite: Number, statut: String,
  }),
  Sejour: new mongoose.Schema({
    ...baseFields,
    chambreId: String, chambreNumero: String, clientNom: String, clientPrenom: String,
    clientPiece: String, nombrePersonnes: Number, dateArrivee: String, dateDepart: String,
    nuits: Number, prixNuit: Number, consommations: Array, statut: String,
    modePaiement: String, totalHebergement: Number, totalConsommations: Number,
  }),
}

// Éviter la re-déclaration des modèles (hot reload)
function getModel(name: keyof typeof schemas) {
  return mongoose.models[name] || mongoose.model(name, schemas[name])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fusionne deux tableaux par 'id', garde le document avec l'updatedAt le plus récent.
 * Stratégie last-write-wins.
 */
function mergeByTimestamp<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  local: T[],
  cloud: T[]
): T[] {
  const map = new Map<string, T>()

  // Charger d'abord les locaux
  for (const item of local) {
    map.set(item.id, item)
  }

  // Fusionner avec les cloud (last-write-wins)
  for (const item of cloud) {
    const existing = map.get(item.id)
    if (!existing) {
      map.set(item.id, item)
    } else {
      const existingTs = new Date(existing.updatedAt || existing.createdAt || 0).getTime()
      const itemTs     = new Date(item.updatedAt     || item.createdAt     || 0).getTime()
      if (itemTs > existingTs) {
        map.set(item.id, item)
      }
    }
  }

  return Array.from(map.values())
}

function tsNow(): string {
  return new Date().toISOString()
}

// ─── Sync locale → cloud ──────────────────────────────────────────────────────

export async function syncToCloud(): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) {
    console.log('[Sync→Cloud] MongoDB non connecté — ignoré')
    return false
  }

  const start = Date.now()
  const now = tsNow()
  let success = true

  const collections: Array<{
    name: string
    getData: () => any[]
    model: mongoose.Model<any>
  }> = [
    { name: 'users',     getData: getUsers,     model: getModel('User') },
    { name: 'commandes', getData: getCommandes, model: getModel('Commande') },
    { name: 'produits',  getData: getProduits,  model: getModel('Produit') },
    { name: 'tables',    getData: getTables,    model: getModel('Table') },
    { name: 'sejours',   getData: getSejours,   model: getModel('Sejour') },
  ]

  for (const col of collections) {
    const colStart = Date.now()
    try {
      const items = col.getData()
      const ops = items.map((item) => ({
        updateOne: {
          filter: { id: item.id },
          update: { $set: { ...item, syncStatus: 'synced', updatedAt: item.updatedAt || now } },
          upsert: true,
        },
      }))

      if (ops.length > 0) {
        await col.model.bulkWrite(ops, { ordered: false })
      }

      addLog({
        timestamp: now,
        direction: 'to_cloud',
        collection: col.name,
        count: items.length,
        success: true,
        durationMs: Date.now() - colStart,
      })
    } catch (err) {
      const msg = (err as Error).message
      addLog({
        timestamp: now,
        direction: 'to_cloud',
        collection: col.name,
        count: 0,
        success: false,
        durationMs: Date.now() - colStart,
        error: msg,
      })
      console.error(`[Sync→Cloud] ✗ ${col.name} :`, msg)
      success = false
    }
  }

  if (success) {
    lastSyncAt = now
    console.log(`[Sync→Cloud] ✓ Terminé en ${Date.now() - start}ms`)
  }
  return success
}

// ─── Sync cloud → locale ──────────────────────────────────────────────────────

export async function syncFromCloud(): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) {
    console.log('[Sync←Cloud] MongoDB non connecté — ignoré')
    return false
  }

  const start = Date.now()
  const now = tsNow()
  let success = true

  try {
    // ── Utilisateurs ────────────────────────────────────────────────────────
    const colStart1 = Date.now()
    const cloudUsers = await getModel('User').find({}).lean()
    const mergedUsers = mergeByTimestamp<UserDocument>(
      getUsers(),
      cloudUsers.map((u: any): UserDocument => ({
        id: u.id, name: u.name, username: u.username, password: u.password,
        role: u.role, isActive: u.isActive ?? true, failedAttempts: u.failedAttempts ?? 0,
        lockedUntil: u.lockedUntil ?? null, lastLogin: u.lastLogin ?? null,
        createdAt: u.createdAt ?? now, updatedAt: u.updatedAt ?? u.createdAt ?? now,
        syncStatus: 'synced',
      }))
    )
    saveUsers(mergedUsers)
    addLog({ timestamp: now, direction: 'from_cloud', collection: 'users', count: cloudUsers.length, success: true, durationMs: Date.now() - colStart1 })

    // ── Commandes ────────────────────────────────────────────────────────────
    const colStart2 = Date.now()
    const cloudCommandes = await getModel('Commande').find({}).lean()
    const mergedCommandes = mergeByTimestamp<CommandeDocument>(
      getCommandes().map((c) => ({ ...c, updatedAt: c.updatedAt || c.createdAt })),
      cloudCommandes.map((c: any): CommandeDocument => ({
        id: c.id, numero: c.numero, serveurId: c.serveurId, serveurNom: c.serveurNom,
        tableId: c.tableId, tableNumero: c.tableNumero, type: c.type, statut: c.statut,
        lignes: c.lignes ?? [], total: c.total, notes: c.notes ?? '',
        createdAt: c.createdAt ?? now, updatedAt: c.updatedAt ?? c.createdAt ?? now,
        modePaiement: c.modePaiement ?? null, syncStatus: 'synced',
      }))
    )
    saveCommandes(mergedCommandes)
    addLog({ timestamp: now, direction: 'from_cloud', collection: 'commandes', count: cloudCommandes.length, success: true, durationMs: Date.now() - colStart2 })

    // ── Produits ─────────────────────────────────────────────────────────────
    const colStart3 = Date.now()
    const cloudProduits = await getModel('Produit').find({}).lean()
    const mergedProduits = mergeByTimestamp<ProduitDocument>(
      getProduits(),
      cloudProduits.map((p: any): ProduitDocument => ({
        id: p.id, code: p.code, nom: p.nom, prix: p.prix, categorie: p.categorie,
        stock: p.stock, stockMin: p.stockMin, unite: p.unite, actif: p.actif ?? true,
        createdAt: p.createdAt ?? now, updatedAt: p.updatedAt ?? p.createdAt ?? now,
        syncStatus: 'synced',
      }))
    )
    saveProduits(mergedProduits)
    addLog({ timestamp: now, direction: 'from_cloud', collection: 'produits', count: cloudProduits.length, success: true, durationMs: Date.now() - colStart3 })

    // ── Tables ───────────────────────────────────────────────────────────────
    const colStart4 = Date.now()
    const cloudTables = await getModel('Table').find({}).lean()
    const mergedTables = mergeByTimestamp<TableDocument>(
      getTables(),
      cloudTables.map((t: any): TableDocument => ({
        id: t.id, numero: t.numero, zone: t.zone, capacite: t.capacite, statut: t.statut,
        createdAt: t.createdAt ?? now, updatedAt: t.updatedAt ?? t.createdAt ?? now,
        syncStatus: 'synced',
      }))
    )
    saveTables(mergedTables)
    addLog({ timestamp: now, direction: 'from_cloud', collection: 'tables', count: cloudTables.length, success: true, durationMs: Date.now() - colStart4 })

    // ── Séjours ──────────────────────────────────────────────────────────────
    const colStart5 = Date.now()
    const cloudSejours = await getModel('Sejour').find({}).lean()
    const mergedSejours = mergeByTimestamp<SejourDocument>(
      getSejours().map((s) => ({ ...s, updatedAt: (s as any).updatedAt || s.createdAt })),
      cloudSejours.map((s: any): SejourDocument => ({
        id: s.id, chambreId: s.chambreId, chambreNumero: s.chambreNumero ?? '',
        clientNom: s.clientNom, clientPrenom: s.clientPrenom ?? '', clientPiece: s.clientPiece ?? '',
        nombrePersonnes: s.nombrePersonnes, dateArrivee: s.dateArrivee, dateDepart: s.dateDepart ?? null,
        nuits: s.nuits ?? 1, prixNuit: s.prixNuit ?? 0, consommations: s.consommations ?? [],
        statut: s.statut, modePaiement: s.modePaiement ?? null,
        totalHebergement: s.totalHebergement ?? 0, totalConsommations: s.totalConsommations ?? 0,
        createdAt: s.createdAt ?? now, updatedAt: s.updatedAt ?? s.createdAt ?? now,
        syncStatus: 'synced',
      }))
    )
    saveSejours(mergedSejours)
    addLog({ timestamp: now, direction: 'from_cloud', collection: 'sejours', count: cloudSejours.length, success: true, durationMs: Date.now() - colStart5 })

    lastSyncAt = now
    console.log(`[Sync←Cloud] ✓ Terminé en ${Date.now() - start}ms`)
  } catch (err) {
    const msg = (err as Error).message
    addLog({ timestamp: now, direction: 'from_cloud', collection: 'all', count: 0, success: false, error: msg })
    console.error('[Sync←Cloud] ✗ Erreur globale :', msg)
    success = false
  }

  return success
}

// ─── Sync bidirectionnelle complète ──────────────────────────────────────────

export async function syncBidirectional(): Promise<SyncResult> {
  if (isSyncing) {
    console.log('[Sync] Sync déjà en cours — ignorée')
    return { success: false, toCloud: false, fromCloud: false, logs: [], durationMs: 0, error: 'Sync déjà en cours' }
  }

  if (mongoose.connection.readyState !== 1) {
    return { success: false, toCloud: false, fromCloud: false, logs: [], durationMs: 0, error: 'MongoDB non connecté' }
  }

  isSyncing = true
  const start = Date.now()
  console.log('[Sync] ⟳ Sync bidirectionnelle démarrée...')

  try {
    const [toCloud, fromCloud] = await Promise.all([syncToCloud(), syncFromCloud()])
    const durationMs = Date.now() - start
    const success = toCloud && fromCloud

    console.log(`[Sync] ${success ? '✓' : '⚠'} Bidirectionnelle terminée en ${durationMs}ms`)
    return { success, toCloud, fromCloud, logs: getSyncLogs().slice(-10), durationMs }
  } catch (err) {
    const msg = (err as Error).message
    return { success: false, toCloud: false, fromCloud: false, logs: [], durationMs: Date.now() - start, error: msg }
  } finally {
    isSyncing = false
  }
}

// ─── Sync périodique ──────────────────────────────────────────────────────────

let syncInterval: ReturnType<typeof setInterval> | null = null

/**
 * Démarre la synchronisation périodique en arrière-plan.
 * Ne bloque jamais l'application.
 * @param intervalMs - Intervalle en ms (défaut: 5 minutes)
 */
export function startPeriodicSync(intervalMs = 5 * 60 * 1000): void {
  if (syncInterval) {
    console.log('[Sync] Sync périodique déjà active')
    return
  }

  console.log(`[Sync] Sync périodique démarrée (toutes les ${intervalMs / 1000}s)`)

  // Première sync immédiate
  syncBidirectional().catch((err) =>
    console.warn('[Sync] Erreur sync initiale :', (err as Error).message)
  )

  syncInterval = setInterval(async () => {
    if (mongoose.connection.readyState !== 1) {
      console.log('[Sync] MongoDB non connecté — sync périodique ignorée')
      return
    }
    await syncBidirectional()
  }, intervalMs)
}

/**
 * Arrête la synchronisation périodique.
 */
export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('[Sync] Sync périodique arrêtée')
  }
}
