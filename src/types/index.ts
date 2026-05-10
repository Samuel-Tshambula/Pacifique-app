/**
 * src/types/index.ts
 *
 * ÉTAPE 10 — Point d'entrée unique pour tous les types.
 * Réexporte les modèles communs + types spécifiques au frontend.
 */

// ─── Modèles communs (local + cloud) ─────────────────────────────────────────
export type {
  BaseDocument,
  SyncStatus,
  Role,
  UserDocument,
  UserPublic,
  TableDocument,
  ProduitDocument,
  LigneCommandeDocument,
  CommandeDocument,
  ChambreDocument,
  ConsommationDocument,
  SejourDocument,
  MouvementDocument,
  ZoneTable,
  StatutTable,
  StatutLigne,
  StatutCommande,
  TypeCommande,
  TypeChambre,
  StatutChambre,
  StatutSejour,
  TypeConsommation,
  TypeMouvement,
} from './models'

export { createBaseDocument, touchDocument } from './models'

// ─── Types spécifiques au frontend ───────────────────────────────────────────

/** Utilisateur connecté (exposé dans le store auth) */
export type User = {
  id: string
  name: string
  username: string
  role: import('./models').Role
}

export type AuthState = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<string>
  logout: () => void
}

// Types de configuration
export type AppRole = 'server' | 'client'
export type AppScreen = 'reception' | 'kitchen' | 'admin'

export type AppConfig = {
  role: AppRole
  screen: AppScreen
  serverUrl?: string
  printerName?: string
  soundEnabled?: boolean
}

export type ConfigValidationResult = {
  valid: boolean
  errors: string[]
  config?: AppConfig
}

export type ConfigSaveResult = {
  success: boolean
  errors: string[]
  config?: AppConfig
}

// Réexport pour compatibilité avec le code existant
export type { Role as UserRole } from './models'
