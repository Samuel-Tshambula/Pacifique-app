import { create } from 'zustand'
import api from '../services/api'

export interface Table {
  id: string
  numero: number
  zone: 'salle' | 'terrasse' | 'bar'
  capacite: number
  statut: 'libre' | 'occupee' | 'reservee' | 'nettoyage'
}

export interface Produit {
  id: string
  code: string
  nom: string
  prix: number
  categorie: string
  stock: number
  stockMin: number
  unite: string
}

export interface LignePanier {
  produitId: string
  produitNom: string
  quantite: number
  prix: number
  notes: string
}

export interface Commande {
  id: string
  numero: string
  serveurId: string
  serveurNom: string
  tableId: string
  tableNumero: number
  statut: string
  lignes: {
    id: string
    produitId: string
    produitNom: string
    quantite: number
    prix: number
    statut: string
    notes: string
    heureCommande: string
    heurePret: string | null
  }[]
  total: number
  notes: string
  createdAt: string
}

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
  ajouterAuPanier: (produit: Produit) => void
  retirerDuPanier: (produitId: string) => void
  modifierQuantite: (produitId: string, quantite: number) => void
  setNoteCommande: (note: string) => void
  viderPanier: () => void
  validerCommande: (serveurId: string, serveurNom: string) => Promise<Commande>
  updateStatutLigne: (commandeId: string, ligneId: string, statut: string) => Promise<void>
  payerCommande: (commandeId: string, modePaiement: string) => Promise<void>
}

export const useVentesStore = create<VentesStore>((set, get) => ({
  tables: [],
  produits: [],
  commandes: [],
  tableSelectionnee: null,
  panier: [],
  noteCommande: '',
  loading: false,

  fetchTables: async () => {
    const { data } = await api.get('/tables')
    set({ tables: data })
  },

  fetchProduits: async () => {
    const { data } = await api.get('/produits')
    set({ produits: data })
  },

  fetchCommandes: async () => {
    const { data } = await api.get('/commandes')
    set({ commandes: data })
  },

  selectionnerTable: (table) => set({ tableSelectionnee: table, panier: [], noteCommande: '' }),

  ajouterAuPanier: (produit) => {
    const panier = get().panier
    const existant = panier.find((l) => l.produitId === produit.id)
    if (existant) {
      set({ panier: panier.map((l) => l.produitId === produit.id ? { ...l, quantite: l.quantite + 1 } : l) })
    } else {
      set({ panier: [...panier, { produitId: produit.id, produitNom: produit.nom, quantite: 1, prix: produit.prix, notes: '' }] })
    }
  },

  retirerDuPanier: (produitId) => set({ panier: get().panier.filter((l) => l.produitId !== produitId) }),

  modifierQuantite: (produitId, quantite) => {
    if (quantite <= 0) { get().retirerDuPanier(produitId); return }
    set({ panier: get().panier.map((l) => l.produitId === produitId ? { ...l, quantite } : l) })
  },

  setNoteCommande: (note) => set({ noteCommande: note }),
  viderPanier: () => set({ panier: [], noteCommande: '', tableSelectionnee: null }),

  validerCommande: async (serveurId, serveurNom) => {
    const { tableSelectionnee, panier, noteCommande } = get()
    const { data } = await api.post('/commandes', {
      serveurId,
      serveurNom,
      tableId: tableSelectionnee!.id,
      tableNumero: tableSelectionnee!.numero,
      lignes: panier,
      notes: noteCommande,
      type: 'sur_place',
    })
    await get().fetchTables()
    await get().fetchCommandes()
    get().viderPanier()
    return data
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
