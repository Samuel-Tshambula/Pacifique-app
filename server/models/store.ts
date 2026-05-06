/**
 * server/models/store.ts
 *
 * ÉTAPE 10 — Tous les documents implémentent BaseDocument :
 *   id, createdAt, updatedAt, syncStatus
 *
 * Les types sont alignés avec src/types/models.ts (source unique de vérité).
 * Les données sont chiffrées avec AES (clé depuis .env).
 * Migration automatique des anciens documents sans les nouveaux champs.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import CryptoJS from 'crypto-js'
import { getEncryptionKey } from '../../config/env.js'
import type {
  TableDocument,
  ProduitDocument,
  CommandeDocument,
  LigneCommandeDocument,
} from '../../src/types/models.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Réexport des types (compatibilité avec les imports existants) ─────────────
export type Table         = TableDocument
export type Produit       = ProduitDocument
export type LigneCommande = LigneCommandeDocument
export type Commande      = CommandeDocument

// ─── Helpers I/O ──────────────────────────────────────────────────────────────

function getPath(file: string): string {
  return path.join(__dirname, `../../data/${file}.json`)
}

/**
 * Lit un fichier JSON chiffré.
 * Migration automatique :
 *   - JSON en clair → chiffre et retourne
 *   - Chiffré → déchiffre et retourne
 *   - Illisible → réinitialise avec le seed
 */
function readJSON<T>(file: string, seed: T[]): T[] {
  const p = getPath(file)
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    writeJSON(file, seed)
    return seed
  }

  const raw = fs.readFileSync(p, 'utf-8')

  // Tentative JSON en clair (migration depuis ancienne version)
  try {
    const plain = JSON.parse(raw)
    if (Array.isArray(plain)) {
      console.info(`[Store] Migration chiffrement : ${file}`)
      const migrated = plain.map((item) => migrateDocument(item))
      writeJSON(file, migrated)
      return migrated
    }
  } catch {
    // Pas du JSON brut — on tente le déchiffrement
  }

  // Déchiffrement AES
  try {
    const decrypted = CryptoJS.AES.decrypt(raw, getEncryptionKey()).toString(CryptoJS.enc.Utf8)
    const parsed = JSON.parse(decrypted)
    // Migration des documents existants sans les nouveaux champs
    const migrated = parsed.map((item: any) => migrateDocument(item))
    return migrated
  } catch {
    console.warn(`[Store] Fichier ${file} illisible — réinitialisation`)
    writeJSON(file, seed)
    return seed
  }
}

function writeJSON<T>(file: string, data: T[]): void {
  const json = JSON.stringify(data, null, 2)
  const encrypted = CryptoJS.AES.encrypt(json, getEncryptionKey()).toString()
  fs.writeFileSync(getPath(file), encrypted)
}

/**
 * ÉTAPE 10 — Migration : ajoute les champs BaseDocument manquants
 * aux documents créés avant cette version.
 */
function migrateDocument<T extends Record<string, any>>(doc: T): T {
  const now = new Date().toISOString()
  return {
    ...doc,
    createdAt:  doc.createdAt  ?? now,
    updatedAt:  doc.updatedAt  ?? doc.createdAt ?? now,
    syncStatus: doc.syncStatus ?? 'pending',
  }
}

// ─── Seeds ────────────────────────────────────────────────────────────────────

const now = new Date().toISOString()

const tablesSeed: Table[] = [
  { id: 't1',  numero: 1,  zone: 'salle',    capacite: 4, statut: 'libre', createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 't2',  numero: 2,  zone: 'salle',    capacite: 4, statut: 'libre', createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 't3',  numero: 3,  zone: 'salle',    capacite: 6, statut: 'libre', createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 't4',  numero: 4,  zone: 'salle',    capacite: 2, statut: 'libre', createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 't5',  numero: 5,  zone: 'salle',    capacite: 4, statut: 'libre', createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 't6',  numero: 6,  zone: 'terrasse', capacite: 4, statut: 'libre', createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 't7',  numero: 7,  zone: 'terrasse', capacite: 6, statut: 'libre', createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 't8',  numero: 8,  zone: 'terrasse', capacite: 4, statut: 'libre', createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 't9',  numero: 9,  zone: 'bar',      capacite: 2, statut: 'libre', createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 't10', numero: 10, zone: 'bar',      capacite: 2, statut: 'libre', createdAt: now, updatedAt: now, syncStatus: 'pending' },
]

const produitsSeed: Produit[] = [
  { id: 'p1',  code: 'BRG01', nom: 'Burger Classic',   prix: 8500,  categorie: 'Burgers',  stock: 50,  stockMin: 10, unite: 'pièce',    actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p2',  code: 'BRG02', nom: 'Burger Fromage',   prix: 9500,  categorie: 'Burgers',  stock: 40,  stockMin: 10, unite: 'pièce',    actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p3',  code: 'BRG03', nom: 'Burger Poulet',    prix: 9000,  categorie: 'Burgers',  stock: 0,   stockMin: 10, unite: 'pièce',    actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p4',  code: 'PIZ01', nom: 'Pizza Margherita', prix: 12000, categorie: 'Pizzas',   stock: 30,  stockMin: 5,  unite: 'pièce',    actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p5',  code: 'PIZ02', nom: 'Pizza Poulet',     prix: 14000, categorie: 'Pizzas',   stock: 25,  stockMin: 5,  unite: 'pièce',    actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p6',  code: 'PIZ03', nom: 'Pizza 4 Fromages', prix: 15000, categorie: 'Pizzas',   stock: 8,   stockMin: 5,  unite: 'pièce',    actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p7',  code: 'BOI01', nom: 'Coca-Cola',        prix: 1500,  categorie: 'Boissons', stock: 100, stockMin: 20, unite: 'bouteille',actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p8',  code: 'BOI02', nom: 'Eau Minérale',     prix: 1000,  categorie: 'Boissons', stock: 150, stockMin: 30, unite: 'bouteille',actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p9',  code: 'BOI03', nom: "Jus d'Orange",     prix: 2000,  categorie: 'Boissons', stock: 60,  stockMin: 15, unite: 'verre',    actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p10', code: 'BOI04', nom: 'Bière Primus',     prix: 2500,  categorie: 'Boissons', stock: 80,  stockMin: 20, unite: 'bouteille',actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p11', code: 'PLA01', nom: 'Poulet Rôti',      prix: 11000, categorie: 'Plats',    stock: 20,  stockMin: 5,  unite: 'pièce',    actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
  { id: 'p12', code: 'PLA02', nom: 'Poisson Grillé',   prix: 13000, categorie: 'Plats',    stock: 15,  stockMin: 5,  unite: 'pièce',    actif: true, createdAt: now, updatedAt: now, syncStatus: 'pending' },
]

// ─── API publique ─────────────────────────────────────────────────────────────

export const getTables    = (): Table[]    => readJSON<Table>('tables', tablesSeed)
export const saveTables   = (data: Table[]) => writeJSON('tables', data)

export const getProduits  = (): Produit[]  => readJSON<Produit>('produits', produitsSeed)
export const saveProduits = (data: Produit[]) => writeJSON('produits', data)

export const getCommandes  = (): Commande[]  => readJSON<Commande>('commandes', [])
export const saveCommandes = (data: Commande[]) => writeJSON('commandes', data)
