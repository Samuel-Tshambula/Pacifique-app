/**
 * server/models/hebergementStore.ts
 *
 * ÉTAPE 10 — ChambreDocument et SejourDocument implémentent BaseDocument.
 * Chiffrement AES ajouté (cohérent avec store.ts).
 * Migration automatique des anciens documents.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import CryptoJS from 'crypto-js'
import { getEncryptionKey } from '../../config/env.js'
import type {
  ChambreDocument,
  SejourDocument,
  ConsommationDocument,
} from '../../src/types/models.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Réexports pour compatibilité
export type Chambre      = ChambreDocument
export type Sejour       = SejourDocument
export type Consommation = ConsommationDocument

// ─── Helpers I/O ──────────────────────────────────────────────────────────────

function getPath(file: string): string {
  return path.join(__dirname, `../../data/${file}.json`)
}

function migrateDocument<T extends Record<string, any>>(doc: T): T {
  const now = new Date().toISOString()
  return {
    ...doc,
    createdAt:  doc.createdAt  ?? now,
    updatedAt:  doc.updatedAt  ?? doc.createdAt ?? now,
    syncStatus: doc.syncStatus ?? 'pending',
  }
}

function readJSON<T>(file: string, seed: T[]): T[] {
  const p = getPath(file)
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    writeJSON(file, seed)
    return seed
  }

  const raw = fs.readFileSync(p, 'utf-8')

  // JSON en clair (migration)
  try {
    const plain = JSON.parse(raw)
    if (Array.isArray(plain)) {
      console.info(`[HebergementStore] Migration chiffrement : ${file}`)
      const migrated = plain.map(migrateDocument)
      writeJSON(file, migrated)
      return migrated as T[]
    }
  } catch {
    // Pas du JSON brut
  }

  // Déchiffrement AES
  try {
    const decrypted = CryptoJS.AES.decrypt(raw, getEncryptionKey()).toString(CryptoJS.enc.Utf8)
    const parsed = JSON.parse(decrypted)
    return parsed.map(migrateDocument) as T[]
  } catch {
    console.warn(`[HebergementStore] ${file} illisible — réinitialisation`)
    writeJSON(file, seed)
    return seed
  }
}

function writeJSON<T>(file: string, data: T[]): void {
  const json      = JSON.stringify(data, null, 2)
  const encrypted = CryptoJS.AES.encrypt(json, getEncryptionKey()).toString()
  fs.writeFileSync(getPath(file), encrypted)
}

// ─── Seeds ────────────────────────────────────────────────────────────────────

const now = new Date().toISOString()

const chambresSeed: Chambre[] = [
  { id: 'c1',  numero: '101', etage: 1, type: 'simple', prix: 25000, statut: 'libre', capacite: 1, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'c2',  numero: '102', etage: 1, type: 'simple', prix: 25000, statut: 'libre', capacite: 1, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'c3',  numero: '103', etage: 1, type: 'double', prix: 40000, statut: 'libre', capacite: 2, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'c4',  numero: '104', etage: 1, type: 'double', prix: 40000, statut: 'libre', capacite: 2, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'c5',  numero: '105', etage: 1, type: 'suite',  prix: 75000, statut: 'libre', capacite: 4, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'c6',  numero: '201', etage: 2, type: 'simple', prix: 25000, statut: 'libre', capacite: 1, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'c7',  numero: '202', etage: 2, type: 'simple', prix: 25000, statut: 'libre', capacite: 1, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'c8',  numero: '203', etage: 2, type: 'double', prix: 40000, statut: 'libre', capacite: 2, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'c9',  numero: '204', etage: 2, type: 'double', prix: 40000, statut: 'libre', capacite: 2, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'c10', numero: '205', etage: 2, type: 'suite',  prix: 75000, statut: 'libre', capacite: 4, createdAt: now, updatedAt: now, syncStatus: 'pending' },
]

// ─── API publique ─────────────────────────────────────────────────────────────

export const getChambres  = (): Chambre[]  => readJSON<Chambre>('chambres', chambresSeed)
export const saveChambres = (data: Chambre[]) => writeJSON('chambres', data)

export const getSejours   = (): Sejour[]   => readJSON<Sejour>('sejours', [])
export const saveSejours  = (data: Sejour[]) => writeJSON('sejours', data)
