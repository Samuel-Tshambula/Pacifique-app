import { Router, Request, Response } from 'express'
import { getCommandes, getProduits } from '../models/store.js'
import { getSejours, getChambres } from '../models/hebergementStore.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { periode = '30' } = req.query
  const jours = parseInt(periode as string) || 30

  const commandes = getCommandes()
  const produits = getProduits()
  const sejours = getSejours()
  const chambres = getChambres()

  const debut = new Date()
  debut.setDate(debut.getDate() - jours)
  debut.setHours(0, 0, 0, 0)

  const commandesPeriode = commandes.filter(
    (c) => c.statut === 'payee' && new Date(c.createdAt) >= debut
  )

  // ── VENTES ──────────────────────────────────────────────
  const totalVentes = commandesPeriode.reduce((s, c) => s + c.total, 0)
  const nbCommandes = commandesPeriode.length
  const panierMoyen = nbCommandes > 0 ? Math.round(totalVentes / nbCommandes) : 0

  // Ventes par jour
  const ventesParJour: Record<string, number> = {}
  for (let i = jours - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    ventesParJour[key] = 0
  }
  commandesPeriode.forEach((c) => {
    const key = new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    if (ventesParJour[key] !== undefined) ventesParJour[key] += c.total
  })
  const graphVentes = Object.entries(ventesParJour).map(([date, ventes]) => ({ date, ventes }))

  // Ventes par mode de paiement
  const parModePaiement: Record<string, number> = {}
  commandesPeriode.forEach((c) => {
    const mode = c.modePaiement || 'non défini'
    parModePaiement[mode] = (parModePaiement[mode] || 0) + c.total
  })

  // Ventes par serveur
  const parServeur: Record<string, { nom: string; commandes: number; total: number }> = {}
  commandesPeriode.forEach((c) => {
    if (!parServeur[c.serveurId]) parServeur[c.serveurId] = { nom: c.serveurNom, commandes: 0, total: 0 }
    parServeur[c.serveurId].commandes++
    parServeur[c.serveurId].total += c.total
  })
  const classementServeurs = Object.values(parServeur).sort((a, b) => b.total - a.total)

  // ── PRODUITS ─────────────────────────────────────────────
  const ventesParProduit: Record<string, { nom: string; categorie: string; quantite: number; chiffre: number }> = {}
  commandesPeriode.forEach((c) => {
    c.lignes.forEach((l: any) => {
      if (!ventesParProduit[l.produitId]) {
        const p = produits.find((p) => p.id === l.produitId)
        ventesParProduit[l.produitId] = { nom: l.produitNom, categorie: p?.categorie || '', quantite: 0, chiffre: 0 }
      }
      ventesParProduit[l.produitId].quantite += l.quantite
      ventesParProduit[l.produitId].chiffre += l.prix * l.quantite
    })
  })
  const topProduits = Object.values(ventesParProduit).sort((a, b) => b.chiffre - a.chiffre)

  // Ventes par catégorie
  const parCategorie: Record<string, number> = {}
  topProduits.forEach((p) => {
    parCategorie[p.categorie] = (parCategorie[p.categorie] || 0) + p.chiffre
  })
  const graphCategories = Object.entries(parCategorie).map(([cat, total]) => ({ cat, total }))

  // ── HÉBERGEMENT ──────────────────────────────────────────
  const sejoursPeriode = sejours.filter((s) => new Date(s.createdAt) >= debut)
  const sejoursTermines = sejoursPeriode.filter((s) => s.statut === 'termine')
  const totalHebergement = sejoursTermines.reduce((s, sej) => s + sej.totalHebergement, 0)
  const totalConsommations = sejoursTermines.reduce((s, sej) => s + (sej.totalConsommations || 0), 0)
  const sejoursEnCours = sejours.filter((s) => s.statut === 'en_cours').length
  const tauxOccupation = chambres.length > 0 ? Math.round((sejoursEnCours / chambres.length) * 100) : 0

  // Revenus hébergement par jour
  const hebergParJour: Record<string, number> = {}
  Object.keys(ventesParJour).forEach((k) => (hebergParJour[k] = 0))
  sejoursTermines.forEach((s) => {
    const key = new Date(s.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    if (hebergParJour[key] !== undefined) hebergParJour[key] += s.totalHebergement
  })
  const graphHebergement = Object.entries(hebergParJour).map(([date, revenus]) => ({ date, revenus }))

  // Répartition par type de chambre
  const parTypeChambre: Record<string, { sejours: number; revenus: number }> = {}
  sejoursTermines.forEach((s) => {
    const chambre = chambres.find((c) => c.id === s.chambreId)
    const type = chambre?.type || 'inconnu'
    if (!parTypeChambre[type]) parTypeChambre[type] = { sejours: 0, revenus: 0 }
    parTypeChambre[type].sejours++
    parTypeChambre[type].revenus += s.totalHebergement
  })

  // ── COMMANDES DÉTAILLÉES ─────────────────────────────────
  const dernieresCommandes = commandesPeriode
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50)
    .map((c) => ({
      id: c.id,
      numero: c.numero,
      date: c.createdAt,
      serveurNom: c.serveurNom,
      tableNumero: c.tableNumero,
      type: c.type,
      total: c.total,
      modePaiement: c.modePaiement,
      nbLignes: c.lignes.length,
    }))

  res.json({
    periode: jours,
    // Ventes
    totalVentes,
    nbCommandes,
    panierMoyen,
    graphVentes,
    parModePaiement,
    classementServeurs,
    // Produits
    topProduits,
    graphCategories,
    // Hébergement
    totalHebergement,
    totalConsommations,
    sejoursEnCours,
    tauxOccupation,
    nbSejoursTermines: sejoursTermines.length,
    graphHebergement,
    parTypeChambre,
    // Commandes
    dernieresCommandes,
  })
})

export default router
