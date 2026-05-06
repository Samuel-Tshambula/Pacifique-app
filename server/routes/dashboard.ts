/**
 * server/routes/dashboard.ts
 *
 * Calculs corrigés :
 *  - Ventes 7 jours : bornes de dates correctes (minuit → 23:59:59)
 *  - evolutionVentes : gère le cas ventesHier = 0
 *  - Graphique heures : seulement les heures passées jusqu'à maintenant
 *  - Revenus hébergement : basé sur les séjours en cours (totalHebergement)
 *  - Temps moyen prépa/livraison : filtre les valeurs négatives ou aberrantes
 *  - revenusHebergement : inclus dans la réponse et cohérent
 */

import { Router, Request, Response } from 'express'
import { getCommandes, getProduits } from '../models/store.js'
import { getSejours, getChambres } from '../models/hebergementStore.js'

const router = Router()

// ─── Helper : début de journée (minuit local) ─────────────────────────────────
function debutJour(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Helper : fin de journée (23:59:59.999) ───────────────────────────────────
function finJour(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

// ─── Helper : évolution en % ──────────────────────────────────────────────────
function calculerEvolution(actuel: number, precedent: number): number {
  if (precedent === 0 && actuel === 0) return 0
  if (precedent === 0) return 100          // Hier = 0, aujourd'hui > 0 → +100%
  return Math.round(((actuel - precedent) / precedent) * 100)
}

router.get('/', (_req: Request, res: Response) => {
  const commandes  = getCommandes()
  const sejours    = getSejours()
  const produits   = getProduits()
  const chambres   = getChambres()

  const maintenant = new Date()
  const debutAujourdhui = debutJour(maintenant)
  const debutHier       = debutJour(new Date(maintenant.getTime() - 86400000))
  const finHier         = finJour(debutHier)

  // ─── Commandes filtrées ──────────────────────────────────────────────────────

  const commandesAujourdhui = commandes.filter((c) => {
    const d = new Date(c.createdAt)
    return d >= debutAujourdhui && c.statut === 'payee'
  })

  const commandesHier = commandes.filter((c) => {
    const d = new Date(c.createdAt)
    return d >= debutHier && d <= finHier && c.statut === 'payee'
  })

  // ─── KPI ventes ──────────────────────────────────────────────────────────────

  const ventesJour = commandesAujourdhui.reduce((sum, c) => sum + c.total, 0)
  const ventesHier = commandesHier.reduce((sum, c) => sum + c.total, 0)
  const evolutionVentes = calculerEvolution(ventesJour, ventesHier)
  const nbCommandes = commandesAujourdhui.length

  // ─── Produit le plus vendu (aujourd'hui) ─────────────────────────────────────

  const ventesParProduit: Record<string, { nom: string; quantite: number; chiffre: number }> = {}
  commandesAujourdhui.forEach((c) => {
    c.lignes.forEach((l) => {
      if (!ventesParProduit[l.produitId]) {
        ventesParProduit[l.produitId] = { nom: l.produitNom, quantite: 0, chiffre: 0 }
      }
      ventesParProduit[l.produitId].quantite += l.quantite
      ventesParProduit[l.produitId].chiffre  += l.prix * l.quantite
    })
  })
  const topProduit = Object.values(ventesParProduit).sort((a, b) => b.quantite - a.quantite)[0] ?? null

  // ─── Classement serveurs (aujourd'hui) ───────────────────────────────────────

  const ventesParServeur: Record<string, { nom: string; commandes: number; total: number }> = {}
  commandesAujourdhui.forEach((c) => {
    if (!ventesParServeur[c.serveurId]) {
      ventesParServeur[c.serveurId] = { nom: c.serveurNom, commandes: 0, total: 0 }
    }
    ventesParServeur[c.serveurId].commandes += 1
    ventesParServeur[c.serveurId].total     += c.total
  })
  const classementServeurs = Object.values(ventesParServeur).sort((a, b) => b.total - a.total)

  // ─── Temps moyen préparation / livraison ─────────────────────────────────────
  // On filtre les valeurs négatives ou > 3h (aberrantes)

  const MAX_TEMPS_MS = 3 * 60 * 60 * 1000 // 3 heures max

  const tempsPreparation: number[] = []
  const tempsLivraison: number[]   = []

  commandesAujourdhui.forEach((c) => {
    c.lignes.forEach((l) => {
      if (l.heurePret && l.heureCommande) {
        const delta = new Date(l.heurePret).getTime() - new Date(l.heureCommande).getTime()
        if (delta > 0 && delta < MAX_TEMPS_MS) tempsPreparation.push(delta)
      }
      if (l.heureServi && l.heureCommande) {
        const delta = new Date(l.heureServi).getTime() - new Date(l.heureCommande).getTime()
        if (delta > 0 && delta < MAX_TEMPS_MS) tempsLivraison.push(delta)
      }
    })
  })

  const moyenneMinutes = (times: number[]): number | null =>
    times.length
      ? Math.round(times.reduce((s, v) => s + v, 0) / times.length / 60000)
      : null

  const tempsMoyenPrepa      = moyenneMinutes(tempsPreparation)
  const tempsMoyenLivraison  = moyenneMinutes(tempsLivraison)

  // ─── Graphique ventes par heure (aujourd'hui, heures passées seulement) ──────

  const heureActuelle = maintenant.getHours()
  const graphHeures: { heure: string; ventes: number }[] = []

  for (let h = 0; h <= heureActuelle; h++) {
    const ventesHeure = commandesAujourdhui
      .filter((c) => new Date(c.createdAt).getHours() === h)
      .reduce((sum, c) => sum + c.total, 0)
    graphHeures.push({ heure: `${h}h`, ventes: ventesHeure })
  }

  // ─── Ventes 7 derniers jours ──────────────────────────────────────────────────

  const ventes7Jours: { date: string; ventes: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const jourDebut = debutJour(new Date(maintenant.getTime() - i * 86400000))
    const jourFin   = finJour(jourDebut)

    const totalJour = commandes
      .filter((c) => {
        const d = new Date(c.createdAt)
        return d >= jourDebut && d <= jourFin && c.statut === 'payee'
      })
      .reduce((sum, c) => sum + c.total, 0)

    ventes7Jours.push({
      date: jourDebut.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      ventes: totalJour,
    })
  }

  // ─── Hébergement ─────────────────────────────────────────────────────────────

  const sejoursEnCours = sejours.filter((s) => s.statut === 'en_cours')
  const nbSejoursEnCours = sejoursEnCours.length
  const totalChambres = chambres.length

  // Revenus hébergement : somme des séjours en cours (hébergement + consommations)
  const revenusHebergement = sejoursEnCours.reduce(
    (sum, s) => sum + s.totalHebergement + (s.totalConsommations ?? 0),
    0
  )

  // Revenus hébergement du jour (séjours créés ou arrivés aujourd'hui)
  const revenusHebergementJour = sejours
    .filter((s) => {
      const arrivee = new Date(s.dateArrivee)
      return arrivee >= debutAujourdhui && s.statut !== 'termine'
    })
    .reduce((sum, s) => sum + s.totalHebergement, 0)

  // ─── Alertes stock ────────────────────────────────────────────────────────────

  const alertesStock = produits
    .filter((p) => p.actif && p.stock <= p.stockMin)
    .map((p) => ({
      nom:      p.nom,
      stock:    p.stock,
      stockMin: p.stockMin,
      statut:   p.stock === 0 ? 'rupture' : 'faible',
    }))
    .sort((a, b) => a.stock - b.stock) // Ruptures en premier

  // ─── Réponse ──────────────────────────────────────────────────────────────────

  res.json({
    // Ventes restaurant
    ventesJour,
    ventesHier,
    evolutionVentes,
    nbCommandes,
    topProduit,
    classementServeurs,
    graphHeures,
    ventes7Jours,

    // Performance cuisine
    tempsMoyenPrepa,
    tempsMoyenLivraison,

    // Hébergement
    sejoursEnCours:          nbSejoursEnCours,
    totalChambres,
    revenusHebergement,
    revenusHebergementJour,

    // Stock
    alertesStock,
  })
})

export default router
