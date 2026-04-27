import { Router, Request, Response } from 'express'
import { getCommandes, getProduits } from '../models/store.js'
import { getSejours, getChambres } from '../models/hebergementStore.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const commandes = getCommandes()
  const sejours = getSejours()
  const produits = getProduits()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const commandesAujourdhui = commandes.filter((c) => {
    const d = new Date(c.createdAt)
    return d >= today && c.statut === 'payee'
  })

  const commandesHier = commandes.filter((c) => {
    const d = new Date(c.createdAt)
    return d >= yesterday && d < today && c.statut === 'payee'
  })

  // Ventes du jour
  const ventesJour = commandesAujourdhui.reduce((sum, c) => sum + c.total, 0)
  const ventesHier = commandesHier.reduce((sum, c) => sum + c.total, 0)
  const evolutionVentes = ventesHier > 0 ? Math.round(((ventesJour - ventesHier) / ventesHier) * 100) : 0

  // Nombre de commandes
  const nbCommandes = commandesAujourdhui.length

  // Produit le plus vendu
  const ventesParProduit: Record<string, { nom: string; quantite: number; chiffre: number }> = {}
  commandesAujourdhui.forEach((c) => {
    c.lignes.forEach((l: any) => {
      if (!ventesParProduit[l.produitId]) {
        ventesParProduit[l.produitId] = { nom: l.produitNom, quantite: 0, chiffre: 0 }
      }
      ventesParProduit[l.produitId].quantite += l.quantite
      ventesParProduit[l.produitId].chiffre += l.prix * l.quantite
    })
  })

  const topProduit = Object.values(ventesParProduit).sort((a, b) => b.quantite - a.quantite)[0] || null

  // Classement serveurs
  const ventesParServeur: Record<string, { nom: string; commandes: number; total: number }> = {}
  commandesAujourdhui.forEach((c) => {
    if (!ventesParServeur[c.serveurId]) {
      ventesParServeur[c.serveurId] = { nom: c.serveurNom, commandes: 0, total: 0 }
    }
    ventesParServeur[c.serveurId].commandes += 1
    ventesParServeur[c.serveurId].total += c.total
  })
  const classementServeurs = Object.values(ventesParServeur).sort((a, b) => b.total - a.total)

  const tempsPreparation: number[] = []
  const tempsLivraison: number[] = []
  commandesAujourdhui.forEach((c) => {
    c.lignes.forEach((l: any) => {
      if (l.heurePret) tempsPreparation.push(new Date(l.heurePret).getTime() - new Date(l.heureCommande).getTime())
      if (l.heureServi) tempsLivraison.push(new Date(l.heureServi).getTime() - new Date(l.heureCommande).getTime())
    })
  })

  const moyenneMinutes = (times: number[]) =>
    times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length / 60000) : null

  const tempsMoyenPrepa = moyenneMinutes(tempsPreparation)
  const tempsMoyenLivraison = moyenneMinutes(tempsLivraison)

  // Ventes par heure
  const ventesParHeure: Record<number, number> = {}
  for (let i = 0; i < 24; i++) ventesParHeure[i] = 0
  commandesAujourdhui.forEach((c) => {
    const h = new Date(c.createdAt).getHours()
    ventesParHeure[h] += c.total
  })
  const graphHeures = Object.entries(ventesParHeure).map(([h, v]) => ({ heure: `${h}h`, ventes: v }))

  // Ventes 7 derniers jours
  const ventes7Jours: { date: string; ventes: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const fin = new Date(d)
    fin.setHours(23, 59, 59, 999)
    const total = commandes
      .filter((c) => new Date(c.createdAt) >= d && new Date(c.createdAt) <= fin && c.statut === 'payee')
      .reduce((sum, c) => sum + c.total, 0)
    ventes7Jours.push({ date: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }), ventes: total })
  }

  // Hébergement
  const sejoursEnCours = sejours.filter((s) => s.statut === 'en_cours').length
  const revenusHebergement = sejours
    .filter((s) => { const d = new Date(s.createdAt); return d >= today })
    .reduce((sum, s) => sum + s.totalHebergement, 0)

  // Alertes stock
  const alertesStock = produits.filter((p) => p.stock <= p.stockMin).map((p) => ({
    nom: p.nom, stock: p.stock, stockMin: p.stockMin, statut: p.stock === 0 ? 'rupture' : 'faible'
  }))

  res.json({
    ventesJour, ventesHier, evolutionVentes, nbCommandes,
    topProduit, classementServeurs, graphHeures, ventes7Jours,
    sejoursEnCours, revenusHebergement, alertesStock,
    totalChambres: getChambres().length,
    tempsMoyenPrepa,
    tempsMoyenLivraison,
  })
})

export default router
