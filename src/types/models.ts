/**
 * src/types/models.ts
 *
 * ÉTAPE 10 — Modèle de données commun local ET cloud.
 *
 * Règle : TOUT document (local JSON ou MongoDB) doit implémenter BaseDocument.
 * Cela garantit que la sync bidirectionnelle fonctionne sans cast ni `as any`.
 *
 * Structure obligatoire de chaque document :
 *   _id        → identifiant métier (string, ex: uuid)
 *   createdAt  → ISO timestamp de création (jamais modifié)
 *   updatedAt  → ISO timestamp de dernière modification (mis à jour à chaque write)
 *   syncStatus → état de synchronisation cloud
 */

// ─── Base commune ─────────────────────────────────────────────────────────────

export type SyncStatus = 'pending' | 'synced'

/**
 * Champs obligatoires présents dans TOUS les documents,
 * qu'ils soient stockés localement (JSON) ou dans MongoDB Atlas.
 */
export interface BaseDocument {
  /** Identifiant métier unique (uuid v4) */
  id: string
  /** ISO timestamp de création — immuable */
  createdAt: string
  /** ISO timestamp de dernière modification — mis à jour à chaque write */
  updatedAt: string
  /** État de synchronisation cloud */
  syncStatus: SyncStatus
}

/**
 * Helper : crée les champs de base pour un nouveau document.
 */
export function createBaseDocument(id: string): BaseDocument {
  const now = new Date().toISOString()
  return { id, createdAt: now, updatedAt: now, syncStatus: 'pending' }
}

/**
 * Helper : met à jour updatedAt et passe syncStatus à 'pending'.
 * À appeler sur chaque mutation locale avant de sauvegarder.
 */
export function touchDocument<T extends BaseDocument>(doc: T): T {
  return { ...doc, updatedAt: new Date().toISOString(), syncStatus: 'pending' }
}

// ─── Rôles ────────────────────────────────────────────────────────────────────

export type Role =
  | 'admin'
  | 'receptionniste'
  | 'serveur'
  | 'cuisinier'
  | 'gestionnaire'
  | 'comptable'

// ─── Utilisateur ──────────────────────────────────────────────────────────────

export interface UserDocument extends BaseDocument {
  name: string
  username: string
  /** Hash bcrypt — jamais exposé au frontend */
  password: string
  role: Role
  isActive: boolean
  failedAttempts: number
  lockedUntil: string | null
  lastLogin: string | null
}

/** Version publique (sans password) — utilisée côté frontend */
export interface UserPublic {
  id: string
  name: string
  username: string
  role: Role
  isActive: boolean
  lastLogin: string | null
  createdAt: string
}

// ─── Table ────────────────────────────────────────────────────────────────────

export type ZoneTable = 'salle' | 'terrasse' | 'bar'
export type StatutTable = 'libre' | 'occupee' | 'reservee' | 'nettoyage'

export interface TableDocument extends BaseDocument {
  numero: number
  zone: ZoneTable
  capacite: number
  statut: StatutTable
}

// ─── Produit ──────────────────────────────────────────────────────────────────

export interface ProduitDocument extends BaseDocument {
  code: string
  nom: string
  prix: number
  categorie: string
  stock: number
  stockMin: number
  unite: string
  actif: boolean
}

// ─── Commande ─────────────────────────────────────────────────────────────────

export type StatutLigne = 'en_attente' | 'en_preparation' | 'pret' | 'servi'
export type StatutCommande = 'en_cours' | 'prete' | 'payee' | 'annulee'
export type TypeCommande = 'sur_place' | 'emporter'

export interface LigneCommandeDocument {
  id: string
  produitId: string
  produitNom: string
  quantite: number
  prix: number
  statut: StatutLigne
  notes: string
  heureCommande: string
  heurePret: string | null
  heureServi: string | null
}

export interface CommandeDocument extends BaseDocument {
  numero: string
  serveurId: string
  serveurNom: string
  tableId: string
  tableNumero: number
  type: TypeCommande
  statut: StatutCommande
  lignes: LigneCommandeDocument[]
  total: number
  notes: string
  modePaiement: string | null
}

// ─── Hébergement ──────────────────────────────────────────────────────────────

export type TypeChambre = 'simple' | 'double' | 'suite'
export type StatutChambre = 'libre' | 'occupee' | 'nettoyage' | 'reservee'

export interface ChambreDocument extends BaseDocument {
  numero: string
  etage: number
  type: TypeChambre
  prix: number
  statut: StatutChambre
  capacite: number
}

export type TypeConsommation = 'restaurant' | 'bar' | 'autre'

export interface ConsommationDocument {
  id: string
  description: string
  montant: number
  date: string
  type: TypeConsommation
}

export type StatutSejour = 'en_cours' | 'termine'

export interface SejourDocument extends BaseDocument {
  chambreId: string
  chambreNumero: string
  clientNom: string
  clientPrenom: string
  clientPiece: string
  nombrePersonnes: number
  dateArrivee: string
  dateDepart: string | null
  nuits: number
  prixNuit: number
  consommations: ConsommationDocument[]
  statut: StatutSejour
  modePaiement: string | null
  totalHebergement: number
  totalConsommations: number
}

// ─── Mouvement de stock ───────────────────────────────────────────────────────

export type TypeMouvement = 'entree' | 'sortie' | 'ajustement'

export interface MouvementDocument extends BaseDocument {
  produitId: string
  produitNom: string
  type: TypeMouvement
  quantite: number
  quantiteAvant: number
  quantiteApres: number
  motif: string
  userId: string
  userName: string
}
