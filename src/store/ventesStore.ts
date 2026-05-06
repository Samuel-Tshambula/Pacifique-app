/**
 * src/store/ventesStore.ts
 *
 * ÉTAPE 10 — Utilise les types communs depuis src/types/models.ts.
 * Les interfaces locales sont supprimées — source unique de vérité.
 */

import { create } from 'zustand'
import api from '../services/api'
import type {
  TableDocument,
  ProduitDocument,
  CommandeDocument,
  LigneCommandeDocument,
} from '../types/models'

// ─── Réexports pour les composants existants ──────────────────────────────────
export type Table   = TableDocument
export type Produit = ProduitDocument
export type Commande = CommandeDocument

export interface LignePanier {
  produitId: string
  produitNom: string
  quantite: number
  prix: number
  notes: string
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface VentesStore {
  tables: Table[]
  produits: Produit[]
  commandes: Commande[]
  tableSelectionnee: Table | null
  panier: LignePanier[]
  noteCommande: string
  loading: boolean

  fetchTables: () => Promise<void>
  fetchProduits: () => Promise<void>
  fetchCommandes: () => Promise<void>
  selectionnerTable: (table: Table) => void
  selectionnerTableOccupee: (table: Table, commande: Commande) => void
  ajouterAuPanier: (produit: Produit) => void
  retirerDuPanier: (produitId: string) => void
  modifierQuantite: (produitId: string, quantite: number) => void
  setNoteCommande: (note: string) => void
  viderPanier: () => void
  validerCommande: (serveurId: string, serveurNom: string) => Promise<Commande>
  annulerCommande: (commandeId: string) => Promise<void>
  updateStatutLigne: (commandeId: string, ligneId: string, statut: LigneCommandeDocument['statut']) => Promise<void>
  payerCommande: (commandeId: string, modePaiement: string) => Promise<void>
}

export const useVentesStore = create<VentesStore>((set, get) => ({
  tables:            [],
  produits:          [],
  commandes:         [],
  tableSelectionnee: null,
  panier:            [],
  noteCommande:      '',
  loading:           false,

  fetchTables: async () => {
    try {
      const { data } = await api.get('/tables')
      set({ tables: data })
    } catch {
      // Mode hors ligne — garder les données en cache
    }
  },

  fetchProduits: async () => {
    try {
      const { data } = await api.get('/produits')
      set({ produits: data })
    } catch {
      // Mode hors ligne — garder les données en cache
    }
  },

  fetchCommandes: async () => {
    try {
      const { data } = await api.get('/commandes')
      set({ commandes: data })
    } catch {
      // Mode hors ligne — garder les données en cache
    }
  },

  selectionnerTable: (table) =>
    set({ tableSelectionnee: table, panier: [], noteCommande: '' }),

  selectionnerTableOccupee: (table, commande) => {
    const panier: LignePanier[] = commande.lignes.map((l) => ({
      produitId: l.produitId,
      produitNom: l.produitNom,
      quantite: l.quantite,
      prix: l.prix,
      notes: l.notes,
    }))
    set({ tableSelectionnee: table, panier, noteCommande: commande.notes })
  },

  ajouterAuPanier: (produit) => {
    const panier = get().panier
    const existant = panier.find((l) => l.produitId === produit.id)
    if (existant) {
      set({
        panier: panier.map((l) =>
          l.produitId === produit.id ? { ...l, quantite: l.quantite + 1 } : l
        ),
      })
    } else {
      set({
        panier: [
          ...panier,
          { produitId: produit.id, produitNom: produit.nom, quantite: 1, prix: produit.prix, notes: '' },
        ],
      })
    }
  },

  retirerDuPanier: (produitId) =>
    set({ panier: get().panier.filter((l) => l.produitId !== produitId) }),

  modifierQuantite: (produitId, quantite) => {
    if (quantite <= 0) { get().retirerDuPanier(produitId); return }
    set({
      panier: get().panier.map((l) =>
        l.produitId === produitId ? { ...l, quantite } : l
      ),
    })
  },

  setNoteCommande: (note) => set({ noteCommande: note }),
  viderPanier: () => set({ panier: [], noteCommande: '' }),

  validerCommande: async (serveurId, serveurNom) => {
    const { tableSelectionnee, panier, noteCommande } = get()
    const { data } = await api.post('/commandes', {
      serveurId,
      serveurNom,
      tableId:     tableSelectionnee!.id,
      tableNumero: tableSelectionnee!.numero,
      lignes:      panier,
      notes:       noteCommande,
      type:        'sur_place',
    })
    set({ panier: [], noteCommande: '', tableSelectionnee: null })
    // Rafraîchir en arrière-plan (non bloquant)
    get().fetchTables()
    get().fetchCommandes()
    return data as Commande
  },

  annulerCommande: async (commandeId) => {
    await api.patch(`/commandes/${commandeId}/annuler`)
    await get().fetchTables()
    await get().fetchCommandes()
  },

  updateStatutLigne: async (commandeId, ligneId, statut) => {
    await api.patch(`/commandes/${commandeId}/lignes/${ligneId}`, { statut })
    await get().fetchCommandes()
  },

  payerCommande: async (commandeId, modePaiement) => {
    await api.patch(`/commandes/${commandeId}/payer`, { modePaiement })
    await get().fetchTables()
    await get().fetchCommandes()
  },
}))
