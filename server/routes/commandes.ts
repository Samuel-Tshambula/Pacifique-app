/**
 * server/routes/commandes.ts
 *
 * ÉTAPE 5 — Chaque mutation émet un événement Socket.IO en temps réel :
 *   POST /          → new_order    (→ cuisine, admin)
 *   PATCH /lignes   → order_update (→ reception, admin)
 *   PATCH /annuler  → order_update (→ reception, admin)
 *   PATCH /payer    → order_update (→ reception, admin)
 *   Quand toutes les lignes sont prêtes → order_ready (→ reception, admin)
 */

import { Router, Request, Response } from 'express'
import { getCommandes, saveCommandes, getTables, saveTables, getProduits, saveProduits } from '../models/store.js'
import { emitToRoom } from '../socket/socketServer.js'
import { v4 as uuid } from 'uuid'
import { createBaseDocument, touchDocument } from '../../src/types/models.js'

const router = Router()

// ─── GET / — Lister les commandes actives ─────────────────────────────────────
router.get('/', (_req: Request, res: Response) => {
  const commandes = getCommandes().filter((c) => c.statut !== 'payee' && c.statut !== 'annulee')
  res.json(commandes)
})

// ─── POST / — Créer une commande ──────────────────────────────────────────────
router.post('/', (req: Request, res: Response) => {
  const { serveurId, serveurNom, tableId, tableNumero, lignes, notes, type } = req.body

  if (!lignes || lignes.length === 0)
    return res.status(400).json({ message: 'La commande doit contenir au moins un produit' })

  const produits = getProduits()

  // Vérifier le stock avant toute modification
  for (const ligne of lignes) {
    const produit = produits.find((p) => p.id === ligne.produitId)
    if (!produit)
      return res.status(400).json({ message: `Produit introuvable : ${ligne.produitId}` })
    if (produit.stock < ligne.quantite)
      return res.status(400).json({ message: `Stock insuffisant pour ${produit.nom}. Disponible : ${produit.stock}` })
  }

  // Décrémenter le stock
  for (const ligne of lignes) {
    const produit = produits.find((p) => p.id === ligne.produitId)!
    produit.stock -= ligne.quantite
  }
  saveProduits(produits)

  const total = lignes.reduce(
    (sum: number, l: { prix: number; quantite: number }) => sum + l.prix * l.quantite, 0
  )
  const now = new Date().toISOString()
  const numero = `CMD-${Date.now()}`

  const commande = {
    ...createBaseDocument(uuid()),
    numero,
    serveurId,
    serveurNom,
    tableId,
    tableNumero,
    type: type || 'sur_place',
    statut: 'en_cours' as const,
    lignes: lignes.map((l: {
      produitId: string; produitNom: string
      quantite: number; prix: number; notes: string
    }) => ({
      id: uuid(),
      ...l,
      statut: 'en_attente',
      heureCommande: now,
      heurePret: null,
      heureServi: null,
    })),
    total,
    notes: notes || '',
    modePaiement: null,
  }

  const commandes = getCommandes()
  commandes.push(commande)
  saveCommandes(commandes)

  // Mettre la table en occupée
  const tables = getTables()
  const table = tables.find((t) => t.id === tableId)
  if (table) { table.statut = 'occupee'; saveTables(tables) }

  // ── Événement Socket.IO : new_order ──────────────────────────────────────
  emitToRoom('kitchen', 'new_order', {
    commandeId: commande.id,
    numero: commande.numero,
    tableNumero: commande.tableNumero,
    serveurNom: commande.serveurNom,
    lignes: commande.lignes.map((l) => ({
      produitNom: l.produitNom,
      quantite: l.quantite,
      notes: l.notes,
    })),
    total: commande.total,
    notes: commande.notes,
    createdAt: commande.createdAt,
  })
  emitToRoom('admin', 'new_order', {
    commandeId: commande.id,
    numero: commande.numero,
    tableNumero: commande.tableNumero,
    serveurNom: commande.serveurNom,
    lignes: commande.lignes.map((l) => ({
      produitNom: l.produitNom,
      quantite: l.quantite,
      notes: l.notes,
    })),
    total: commande.total,
    notes: commande.notes,
    createdAt: commande.createdAt,
  })

  res.status(201).json(commande)
})

// ─── PATCH /:id/lignes/:ligneId — Mettre à jour le statut d'une ligne ─────────
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

  // Passer la commande en "prete" si toutes les lignes sont prêtes/servies
  const toutPret = commande.lignes.every((l) => l.statut === 'pret' || l.statut === 'servi')
  if (toutPret && commande.statut !== 'payee') {
    commande.statut = 'prete'
  }
  commande.updatedAt = now
  commande.syncStatus = 'pending'
  saveCommandes(commandes)

  // ── Événement Socket.IO : order_update ────────────────────────────────────
  const updatePayload = {
    commandeId: commande.id,
    ligneId: ligne.id,
    statut: ligne.statut,
    commandeStatut: commande.statut,
    tableNumero: commande.tableNumero,
    updatedAt: now,
  }
  emitToRoom('reception', 'order_update', updatePayload)
  emitToRoom('admin', 'order_update', updatePayload)

  // ── Événement Socket.IO : order_ready (si toutes les lignes prêtes) ───────
  if (toutPret) {
    const readyPayload = {
      commandeId: commande.id,
      tableNumero: commande.tableNumero,
      serveurNom: commande.serveurNom,
      updatedAt: now,
    }
    emitToRoom('reception', 'order_ready', readyPayload)
    emitToRoom('admin', 'order_ready', readyPayload)
  }

  res.json(commande)
})

// ─── GET /:id/facture — Facture structurée ────────────────────────────────────
router.get('/:id/facture', (req: Request, res: Response) => {
  const commandes = getCommandes()
  const commande = commandes.find((c) => c.id === req.params.id)
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' })

  res.json({
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
  })
})

// ─── PATCH /:id/annuler — Annuler une commande ────────────────────────────────
router.patch('/:id/annuler', (_req: Request, res: Response) => {
  const commandes = getCommandes()
  const commande = commandes.find((c) => c.id === _req.params.id)
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' })
  if (commande.statut === 'payee')
    return res.status(400).json({ message: 'Impossible d\'annuler une commande payée' })

  // Remettre le stock
  const produits = getProduits()
  for (const ligne of commande.lignes) {
    const produit = produits.find((p) => p.id === ligne.produitId)
    if (produit) produit.stock += ligne.quantite
  }
  saveProduits(produits)

  const now = new Date().toISOString()
  commande.statut = 'annulee'
  commande.updatedAt = now
  commande.syncStatus = 'pending'
  saveCommandes(commandes)

  // Libérer la table
  const tables = getTables()
  const table = tables.find((t) => t.id === commande.tableId)
  if (table) { table.statut = 'libre'; saveTables(tables) }

  // ── Événement Socket.IO : order_update ────────────────────────────────────
  const payload = { commandeId: commande.id, statut: 'annulee', tableNumero: commande.tableNumero, updatedAt: now }
  emitToRoom('kitchen', 'order_update', payload)
  emitToRoom('reception', 'order_update', payload)
  emitToRoom('admin', 'order_update', payload)

  res.json(commande)
})

// ─── PATCH /:id/payer — Payer une commande ────────────────────────────────────
router.patch('/:id/payer', (req: Request, res: Response) => {
  const commandes = getCommandes()
  const commande = commandes.find((c) => c.id === req.params.id)
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' })

  const now = new Date().toISOString()
  commande.statut = 'payee'
  commande.modePaiement = req.body.modePaiement
  commande.updatedAt = now
  commande.syncStatus = 'pending'
  saveCommandes(commandes)

  // Libérer la table
  const tables = getTables()
  const table = tables.find((t) => t.id === commande.tableId)
  if (table) { table.statut = 'libre'; saveTables(tables) }

  // ── Événement Socket.IO : order_update ────────────────────────────────────
  const payload = { commandeId: commande.id, statut: 'payee', tableNumero: commande.tableNumero, updatedAt: now }
  emitToRoom('kitchen', 'order_update', payload)
  emitToRoom('reception', 'order_update', payload)
  emitToRoom('admin', 'order_update', payload)

  res.json(commande)
})

export default router
