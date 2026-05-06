/**
 * services/db.local.ts
 * Façade unifiée pour accéder aux données locales (fichiers JSON chiffrés).
 * Réexporte toutes les fonctions des stores existants.
 * Point d'entrée unique pour la couche données locale.
 */

// ─── Tables & Commandes & Produits ────────────────────────────────────────────
export {
  getTables,
  saveTables,
  getProduits,
  saveProduits,
  getCommandes,
  saveCommandes,
} from '../server/models/store.js'

export type {
  Table,
  Produit,
  Commande,
  LigneCommande,
} from '../server/models/store.js'

// ─── Utilisateurs ─────────────────────────────────────────────────────────────
export {
  getUsers,
  saveUsers,
} from '../server/models/userStore.js'

export type { User } from '../server/models/userStore.js'

// ─── Hébergement ──────────────────────────────────────────────────────────────
export {
  getChambres,
  saveChambres,
  getSejours,
  saveSejours,
} from '../server/models/hebergementStore.js'

export type {
  Chambre,
  Sejour,
  Consommation,
} from '../server/models/hebergementStore.js'
