import { Router, Request, Response } from 'express'
import { getProduits, saveProduits } from '../models/store.js'
import { getUsers } from '../models/userStore.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MOUVEMENTS_PATH = path.join(__dirname, '../../data/mouvements.json')

function getMouvements() {
  if (!fs.existsSync(MOUVEMENTS_PATH)) fs.writeFileSync(MOUVEMENTS_PATH, '[]')
  return JSON.parse(fs.readFileSync(MOUVEMENTS_PATH, 'utf-8'))
}

function saveMouvements(data: object[]) {
  fs.writeFileSync(MOUVEMENTS_PATH, JSON.stringify(data, null, 2))
}

const router = Router()

// Liste tous les produits
router.get('/', (_req: Request, res: Response) => {
  res.json(getProduits())
})

// Ajouter un produit
router.post('/', (req: Request, res: Response) => {
  const { code, nom, prix, categorie, stock, stockMin, unite } = req.body
  if (!code || !nom || prix === undefined || !categorie)
    return res.status(400).json({ message: 'Champs obligatoires manquants' })

  const produits = getProduits()
  if (produits.find((p) => p.code === code))
    return res.status(400).json({ message: 'Ce code produit existe déjà' })

  const newProduit = {
    id: uuid(), code, nom, prix: Number(prix), categorie,
    stock: Number(stock) || 0, stockMin: Number(stockMin) || 5,
    unite: unite || 'pièce', actif: true,
  }
  produits.push(newProduit)
  saveProduits(produits)
  res.status(201).json(newProduit)
})

// Modifier un produit (partiel)
router.patch('/:id', (req: Request, res: Response) => {
  const produits = getProduits()
  const produit = produits.find((p) => p.id === req.params.id)
  if (!produit) return res.status(404).json({ message: 'Produit introuvable' })
  Object.assign(produit, req.body)
  saveProduits(produits)
  res.json(produit)
})

// Modifier un produit (complet)
router.put('/:id', (req: Request, res: Response) => {
  const { code, nom, prix, categorie, stock, stockMin, unite } = req.body
  if (!code || !nom || prix === undefined || !categorie)
    return res.status(400).json({ message: 'Champs obligatoires manquants' })
  const produits = getProduits()
  const idx = produits.findIndex((p) => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Produit introuvable' })
  const codeExist = produits.find((p) => p.code === code && p.id !== req.params.id)
  if (codeExist) return res.status(400).json({ message: 'Ce code produit existe déjà' })
  produits[idx] = { ...produits[idx], code, nom, prix: Number(prix), categorie, stock: Number(stock) || 0, stockMin: Number(stockMin) || 5, unite: unite || 'pièce' }
  saveProduits(produits)
  res.json(produits[idx])
})

// Désactiver un produit (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const produits = getProduits()
  const produit = produits.find((p) => p.id === req.params.id)
  if (!produit) return res.status(404).json({ message: 'Produit introuvable' })
  produit.actif = false
  saveProduits(produits)
  res.json({ message: 'Produit désactivé' })
})

// Mouvement de stock (entrée / ajustement)
router.post('/:id/mouvement', (req: Request, res: Response) => {
  const { type, quantite, motif, userId } = req.body
  const produits = getProduits()
  const produit = produits.find((p) => p.id === req.params.id)
  if (!produit) return res.status(404).json({ message: 'Produit introuvable' })

  const users = getUsers()
  const user = users.find((u) => u.id === userId)

  const qte = Number(quantite)
  if (type === 'entree') produit.stock += qte
  else if (type === 'ajustement') produit.stock = qte
  else if (type === 'sortie') {
    if (produit.stock < qte) return res.status(400).json({ message: 'Stock insuffisant' })
    produit.stock -= qte
  }

  saveProduits(produits)

  const mouvement = {
    id: uuid(), produitId: produit.id, produitNom: produit.nom,
    type, quantite: qte, motif: motif || '',
    userName: user?.name || 'Inconnu',
    date: new Date().toISOString(),
  }
  const mouvements = getMouvements()
  mouvements.push(mouvement)
  saveMouvements(mouvements)

  res.json({ produit, mouvement })
})

// Historique des mouvements d'un produit
router.get('/:id/mouvements', (req: Request, res: Response) => {
  const mouvements = getMouvements().filter((m: { produitId: string }) => m.produitId === req.params.id)
  res.json(mouvements.reverse())
})

export default router
