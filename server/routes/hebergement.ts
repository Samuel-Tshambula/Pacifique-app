import { Router, Request, Response } from 'express'
import { getChambres, saveChambres, getSejours, saveSejours } from '../models/hebergementStore.js'
import { v4 as uuid } from 'uuid'

const router = Router()

// Liste des chambres
router.get('/chambres', (_req: Request, res: Response) => {
  res.json(getChambres())
})

// Liste des séjours en cours
router.get('/sejours', (_req: Request, res: Response) => {
  res.json(getSejours())
})

// Check-in
router.post('/checkin', (req: Request, res: Response) => {
  const { chambreId, clientNom, clientPrenom, clientPiece, nombrePersonnes, nuits } = req.body
  if (!chambreId || !clientNom || !clientPrenom || !nuits)
    return res.status(400).json({ message: 'Champs obligatoires manquants' })

  const chambres = getChambres()
  const chambre = chambres.find((c) => c.id === chambreId)
  if (!chambre) return res.status(404).json({ message: 'Chambre introuvable' })
  if (chambre.statut !== 'libre') return res.status(400).json({ message: 'Chambre non disponible' })

  chambre.statut = 'occupee'
  saveChambres(chambres)

  const sejour: any = {
    id: uuid(),
    chambreId,
    chambreNumero: chambre.numero,
    clientNom,
    clientPrenom,
    clientPiece: clientPiece || '',
    nombrePersonnes: Number(nombrePersonnes) || 1,
    dateArrivee: new Date().toISOString(),
    dateDepart: null,
    nuits: Number(nuits),
    prixNuit: chambre.prix,
    consommations: [],
    statut: 'en_cours',
    modePaiement: null,
    totalHebergement: chambre.prix * Number(nuits),
    totalConsommations: 0,
    createdAt: new Date().toISOString(),
  }

  const sejours = getSejours()
  sejours.push(sejour)
  saveSejours(sejours)

  res.status(201).json(sejour)
})

// Ajouter une consommation au séjour
router.post('/sejours/:id/consommation', (req: Request, res: Response) => {
  const { description, montant, type } = req.body
  const sejours = getSejours()
  const sejour = sejours.find((s) => s.id === req.params.id)
  if (!sejour) return res.status(404).json({ message: 'Séjour introuvable' })

  const conso = { id: uuid(), description, montant: Number(montant), type: type || 'autre', date: new Date().toISOString() }
  sejour.consommations.push(conso)
  sejour.totalConsommations = sejour.consommations.reduce((sum: number, c: any) => sum + c.montant, 0)
  saveSejours(sejours)
  res.json(sejour)
})

// Check-out
router.post('/checkout/:id', (req: Request, res: Response) => {
  const { modePaiement } = req.body
  const sejours = getSejours()
  const sejour = sejours.find((s) => s.id === req.params.id)
  if (!sejour) return res.status(404).json({ message: 'Séjour introuvable' })

  sejour.statut = 'termine'
  sejour.dateDepart = new Date().toISOString()
  sejour.modePaiement = modePaiement || 'especes'
  saveSejours(sejours)

  const chambres = getChambres()
  const chambre = chambres.find((c) => c.id === sejour.chambreId)
  if (chambre) { chambre.statut = 'nettoyage'; saveChambres(chambres) }

  res.json(sejour)
})

// Marquer chambre comme nettoyée
router.patch('/chambres/:id/statut', (req: Request, res: Response) => {
  const chambres = getChambres()
  const chambre = chambres.find((c) => c.id === req.params.id)
  if (!chambre) return res.status(404).json({ message: 'Chambre introuvable' })
  chambre.statut = req.body.statut
  saveChambres(chambres)
  res.json(chambre)
})

export default router
