import { Router, Request, Response } from 'express'
import { getCommandes, saveCommandes, getTables, saveTables, getProduits, saveProduits } from '../models/store.js'
import { v4 as uuid } from 'uuid'

const router = Router()

// Lister les commandes actives
router.get('/', (_req: Request, res: Response) => {
  const commandes = getCommandes().filter((c) => c.statut !== 'payee' && c.statut !== 'annulee')
  res.json(commandes)
})

// Créer une commande
router.post('/', (req: Request, res: Response) => {
  const { serveurId, serveurNom, tableId, tableNumero, lignes, notes, type } = req.body

  if (!lignes || lignes.length === 0)
    return res.status(400).json({ message: 'La commande doit contenir au moins un produit' })

  const produits = getProduits()

  // Vérifier et décrémenter le stock
  for (const ligne of lignes) {
    const produit = produits.find((p) => p.id === ligne.produitId)
    if (!produit) return res.status(400).json({ message: `Produit introuvable : ${ligne.produitId}` })
    if (produit.stock < ligne.quantite)
      return res.status(400).json({ message: `Stock insuffisant pour ${produit.nom}. Disponible : ${produit.stock}` })
  }

  for (const ligne of lignes) {
    const produit = produits.find((p) => p.id === ligne.produitId)!
    produit.stock -= ligne.quantite
  }
  saveProduits(produits)

  const total = lignes.reduce((sum: number, l: { prix: number; quantite: number }) => sum + l.prix * l.quantite, 0)
  const now = new Date().toISOString()
  const numero = `CMD-${Date.now()}`

  const commande = {
    id: uuid(),
    numero,
    serveurId,
    serveurNom,
    tableId,
    tableNumero,
    type: type || 'sur_place',
    statut: 'en_cours',
    lignes: lignes.map((l: { produitId: string; produitNom: string; quantite: number; prix: number; notes: string }) => ({
      id: uuid(),
      ...l,
      statut: 'en_attente',
      heureCommande: now,
      heurePret: null,
    })),
    total,
    notes: notes || '',
    createdAt: now,
    updatedAt: now,
    modePaiement: null,
  }

  const commandes = getCommandes()
  commandes.push(commande)
  saveCommandes(commandes)

  // Mettre la table en occupée
  const tables = getTables()
  const table = tables.find((t) => t.id === tableId)
  if (table) { table.statut = 'occupee'; saveTables(tables) }

  res.status(201).json(commande)
})

// Mettre à jour le statut d'une ligne (cuisinier)
router.patch('/:id/lignes/:ligneId', (req: Request, res: Response) => {
  const commandes = getCommandes()
  const commande = commandes.find((c) => c.id === req.params.id)
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' })

  const ligne = commande.lignes.find((l) => l.id === req.params.ligneId)
  if (!ligne) return res.status(404).json({ message: 'Ligne introuvable' })

  const statut = req.body.statut
  const statutsAutorises = ['en_attente', 'en_preparation', 'pret', 'servi']
  if (!statutsAutorises.includes(statut))
    return res.status(400).json({ message: 'Statut de ligne invalide' })

  ligne.statut = statut
  const now = new Date().toISOString()
  if (statut === 'pret' && !ligne.heurePret) ligne.heurePret = now
  if (statut === 'servi') {
    if (!ligne.heurePret) ligne.heurePret = now
    ligne.heureServi = ligne.heureServi || now
  }

  if (commande.lignes.every((l) => l.statut === 'pret' || l.statut === 'servi')) {
    if (commande.statut !== 'payee') commande.statut = 'prete'
  }
  commande.updatedAt = now

  saveCommandes(commandes)
  res.json(commande)
})

// Facture structurée pour une commande
router.get('/:id/facture', (req: Request, res: Response) => {
  const commandes = getCommandes()
  const commande = commandes.find((c) => c.id === req.params.id)
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' })

  const facture = {
    factureId: `FAC-${commande.numero}`,
    date: new Date().toISOString(),
    commandeId: commande.id,
    numeroCommande: commande.numero,
    serveurNom: commande.serveurNom,
    tableNumero: commande.tableNumero,
    type: commande.type,
    statutCommande: commande.statut,
    modePaiement: commande.modePaiement || 'non défini',
    lignes: commande.lignes.map((l: any) => ({
      designation: l.produitNom,
      quantite: l.quantite,
      prixUnitaire: l.prix,
      montant: l.prix * l.quantite,
    })),
    totalHT: commande.total,
    taxes: 0,
    totalTTC: commande.total,
    notes: commande.notes,
  }

  res.json(facture)
})

// Payer une commande
router.patch('/:id/payer', (req: Request, res: Response) => {
  const commandes = getCommandes()
  const commande = commandes.find((c) => c.id === req.params.id)
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' })

  commande.statut = 'payee'
  commande.modePaiement = req.body.modePaiement
  commande.updatedAt = new Date().toISOString()
  saveCommandes(commandes)

  // Libérer la table
  const tables = getTables()
  const table = tables.find((t) => t.id === commande.tableId)
  if (table) { table.statut = 'libre'; saveTables(tables) }

  res.json(commande)
})

export default router
