import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import CryptoJS from 'crypto-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || 'pacifique_default_key_dev_only'

export interface Table {
  id: string
  numero: number
  zone: 'salle' | 'terrasse' | 'bar'
  capacite: number
  statut: 'libre' | 'occupee' | 'reservee' | 'nettoyage'
}

export interface Produit {
  id: string
  code: string
  nom: string
  prix: number
  categorie: string
  stock: number
  stockMin: number
  unite: string
  actif: boolean
}

export interface LigneCommande {
  id: string
  produitId: string
  produitNom: string
  quantite: number
  prix: number
  statut: 'en_attente' | 'en_preparation' | 'pret' | 'servi'
  notes: string
  heureCommande: string
  heurePret: string | null
  heureServi: string | null
}

export interface Commande {
  id: string
  numero: string
  serveurId: string
  serveurNom: string
  tableId: string
  tableNumero: number
  type: 'sur_place' | 'emporter'
  statut: 'en_cours' | 'prete' | 'payee' | 'annulee'
  lignes: LigneCommande[]
  total: number
  notes: string
  createdAt: string
  updatedAt: string
  modePaiement: string | null
}

function getPath(file: string) {
  return path.join(__dirname, `../../data/${file}.json`)
}

function readJSON<T>(file: string, seed: T[]): T[] {
  const p = getPath(file)
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    writeJSON(file, seed)
    return seed
  }
  const raw = fs.readFileSync(p, 'utf-8')
  // Détection JSON en clair (migration)
  try {
    const plain = JSON.parse(raw)
    console.info(`Migration chiffrement pour ${file}`)
    writeJSON(file, plain)
    return plain
  } catch {
    // pas du JSON brut, on tente le déchiffrement
  }
  try {
    const decrypted = CryptoJS.AES.decrypt(raw, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)
    return JSON.parse(decrypted)
  } catch {
    console.warn(`Fichier ${file} illisible, réinitialisation avec seed`)
    writeJSON(file, seed)
    return seed
  }
}

function writeJSON<T>(file: string, data: T[]) {
  const jsonData = JSON.stringify(data, null, 2)
  const encryptedData = CryptoJS.AES.encrypt(jsonData, ENCRYPTION_KEY).toString()
  fs.writeFileSync(getPath(file), encryptedData)
}

const tablesSeed: Table[] = [
  { id: 't1', numero: 1, zone: 'salle', capacite: 4, statut: 'libre' },
  { id: 't2', numero: 2, zone: 'salle', capacite: 4, statut: 'libre' },
  { id: 't3', numero: 3, zone: 'salle', capacite: 6, statut: 'libre' },
  { id: 't4', numero: 4, zone: 'salle', capacite: 2, statut: 'libre' },
  { id: 't5', numero: 5, zone: 'salle', capacite: 4, statut: 'libre' },
  { id: 't6', numero: 6, zone: 'terrasse', capacite: 4, statut: 'libre' },
  { id: 't7', numero: 7, zone: 'terrasse', capacite: 6, statut: 'libre' },
  { id: 't8', numero: 8, zone: 'terrasse', capacite: 4, statut: 'libre' },
  { id: 't9', numero: 9, zone: 'bar', capacite: 2, statut: 'libre' },
  { id: 't10', numero: 10, zone: 'bar', capacite: 2, statut: 'libre' },
]

const produitsSeed: Produit[] = [
  { id: 'p1', code: 'BRG01', nom: 'Burger Classic', prix: 8500, categorie: 'Burgers', stock: 50, stockMin: 10, unite: 'pièce', actif: true },
  { id: 'p2', code: 'BRG02', nom: 'Burger Fromage', prix: 9500, categorie: 'Burgers', stock: 40, stockMin: 10, unite: 'pièce', actif: true },
  { id: 'p3', code: 'BRG03', nom: 'Burger Poulet', prix: 9000, categorie: 'Burgers', stock: 0, stockMin: 10, unite: 'pièce', actif: true },
  { id: 'p4', code: 'PIZ01', nom: 'Pizza Margherita', prix: 12000, categorie: 'Pizzas', stock: 30, stockMin: 5, unite: 'pièce', actif: true },
  { id: 'p5', code: 'PIZ02', nom: 'Pizza Poulet', prix: 14000, categorie: 'Pizzas', stock: 25, stockMin: 5, unite: 'pièce', actif: true },
  { id: 'p6', code: 'PIZ03', nom: 'Pizza 4 Fromages', prix: 15000, categorie: 'Pizzas', stock: 8, stockMin: 5, unite: 'pièce', actif: true },
  { id: 'p7', code: 'BOI01', nom: 'Coca-Cola', prix: 1500, categorie: 'Boissons', stock: 100, stockMin: 20, unite: 'bouteille', actif: true },
  { id: 'p8', code: 'BOI02', nom: 'Eau Minérale', prix: 1000, categorie: 'Boissons', stock: 150, stockMin: 30, unite: 'bouteille', actif: true },
  { id: 'p9', code: 'BOI03', nom: 'Jus d\'Orange', prix: 2000, categorie: 'Boissons', stock: 60, stockMin: 15, unite: 'verre', actif: true },
  { id: 'p10', code: 'BOI04', nom: 'Bière Primus', prix: 2500, categorie: 'Boissons', stock: 80, stockMin: 20, unite: 'bouteille', actif: true },
  { id: 'p11', code: 'PLA01', nom: 'Poulet Rôti', prix: 11000, categorie: 'Plats', stock: 20, stockMin: 5, unite: 'pièce', actif: true },
  { id: 'p12', code: 'PLA02', nom: 'Poisson Grillé', prix: 13000, categorie: 'Plats', stock: 15, stockMin: 5, unite: 'pièce', actif: true },
]

export const getTables = () => readJSON<Table>('tables', tablesSeed)
export const saveTables = (data: Table[]) => writeJSON('tables', data)
export const getProduits = () => readJSON<Produit>('produits', produitsSeed)
export const saveProduits = (data: Produit[]) => writeJSON('produits', data)
export const getCommandes = () => readJSON<Commande>('commandes', [])
export const saveCommandes = (data: Commande[]) => writeJSON('commandes', data)
