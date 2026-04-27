import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface Chambre {
  id: string
  numero: string
  etage: number
  type: 'simple' | 'double' | 'suite'
  prix: number
  statut: 'libre' | 'occupee' | 'nettoyage' | 'reservee'
  capacite: number
}

export interface Sejour {
  id: string
  chambreId: string
  chambreNumero: string
  clientNom: string
  clientPrenom: string
  clientPiece: string
  nombrePersonnes: number
  dateArrivee: string
  dateDepart: string | null
  nuits: number
  prixNuit: number
  consommations: Consommation[]
  statut: 'en_cours' | 'termine'
  modePaiement: string | null
  totalHebergement: number
  totalConsommations: number
  createdAt: string
}

export interface Consommation {
  id: string
  description: string
  montant: number
  date: string
  type: 'restaurant' | 'bar' | 'autre'
}

function getPath(file: string) {
  return path.join(__dirname, `../../data/${file}.json`)
}

function readJSON<T>(file: string, seed: T[]): T[] {
  const p = getPath(file)
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(seed, null, 2))
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

function writeJSON<T>(file: string, data: T[]) {
  fs.writeFileSync(getPath(file), JSON.stringify(data, null, 2))
}

const chambresSeed: Chambre[] = [
  { id: 'c1', numero: '101', etage: 1, type: 'simple', prix: 25000, statut: 'libre', capacite: 1 },
  { id: 'c2', numero: '102', etage: 1, type: 'simple', prix: 25000, statut: 'libre', capacite: 1 },
  { id: 'c3', numero: '103', etage: 1, type: 'double', prix: 40000, statut: 'libre', capacite: 2 },
  { id: 'c4', numero: '104', etage: 1, type: 'double', prix: 40000, statut: 'libre', capacite: 2 },
  { id: 'c5', numero: '105', etage: 1, type: 'suite', prix: 75000, statut: 'libre', capacite: 4 },
  { id: 'c6', numero: '201', etage: 2, type: 'simple', prix: 25000, statut: 'libre', capacite: 1 },
  { id: 'c7', numero: '202', etage: 2, type: 'simple', prix: 25000, statut: 'libre', capacite: 1 },
  { id: 'c8', numero: '203', etage: 2, type: 'double', prix: 40000, statut: 'libre', capacite: 2 },
  { id: 'c9', numero: '204', etage: 2, type: 'double', prix: 40000, statut: 'libre', capacite: 2 },
  { id: 'c10', numero: '205', etage: 2, type: 'suite', prix: 75000, statut: 'libre', capacite: 4 },
]

export const getChambres = () => readJSON<Chambre>('chambres', chambresSeed)
export const saveChambres = (data: Chambre[]) => writeJSON('chambres', data)
export const getSejours = () => readJSON<Sejour>('sejours', [])
export const saveSejours = (data: Sejour[]) => writeJSON('sejours', data)
