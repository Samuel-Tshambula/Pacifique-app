/**
 * config/env.ts
 * Validation et accès centralisé aux variables d'environnement.
 *
 * Règles :
 *  - Toutes les variables sont lues depuis process.env (chargé par dotenv)
 *  - Aucune valeur sensible codée en dur dans le code
 *  - Les variables critiques (JWT_SECRET, DATA_ENCRYPTION_KEY) sont validées
 *    au démarrage — le serveur refuse de démarrer si elles sont absentes ou
 *    si elles contiennent les valeurs placeholder du .env.example
 *  - MONGODB_URI est optionnelle (mode offline si absente)
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Chargement du .env ───────────────────────────────────────────────────────

/**
 * Charge le fichier .env depuis la racine du projet.
 * Doit être appelé une seule fois, le plus tôt possible au démarrage.
 */
export function loadEnv(): void {
  const envPath = path.resolve(__dirname, '../.env')
  const result = dotenv.config({ path: envPath })

  if (result.error) {
    // .env absent : acceptable en production si les vars sont injectées autrement
    console.warn(`[Env] .env non trouvé (${envPath}) — variables d'environnement système utilisées`)
  } else {
    console.log('[Env] ✓ .env chargé')
  }
}

// ─── Valeurs placeholder à rejeter ───────────────────────────────────────────

const PLACEHOLDER_PATTERNS = [
  'REMPLACER_PAR',
  'username:password',
  'your_secret',
  'change_me',
  'example',
]

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => value.toLowerCase().includes(p.toLowerCase()))
}

// ─── Validation au démarrage ──────────────────────────────────────────────────

export interface EnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Valide les variables d'environnement critiques.
 * Retourne les erreurs (bloquantes) et warnings (non bloquants).
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // ── JWT_SECRET ─────────────────────────────────────────────────────────────
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    errors.push('JWT_SECRET manquant. Définissez-le dans .env')
  } else if (isPlaceholder(jwtSecret)) {
    errors.push('JWT_SECRET contient une valeur placeholder. Remplacez-la par un secret aléatoire.')
  } else if (jwtSecret.length < 32) {
    warnings.push(`JWT_SECRET trop court (${jwtSecret.length} chars). Recommandé : 64+ chars.`)
  }

  // ── DATA_ENCRYPTION_KEY ────────────────────────────────────────────────────
  const encKey = process.env.DATA_ENCRYPTION_KEY
  if (!encKey) {
    errors.push('DATA_ENCRYPTION_KEY manquante. Définissez-la dans .env')
  } else if (isPlaceholder(encKey)) {
    errors.push('DATA_ENCRYPTION_KEY contient une valeur placeholder. Remplacez-la par une clé aléatoire.')
  } else if (encKey.length < 16) {
    warnings.push(`DATA_ENCRYPTION_KEY trop courte (${encKey.length} chars). Recommandé : 32+ chars.`)
  }

  // ── MONGODB_URI ────────────────────────────────────────────────────────────
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri || mongoUri.trim() === '') {
    warnings.push('MONGODB_URI non définie — synchronisation cloud désactivée (mode offline uniquement).')
  } else if (isPlaceholder(mongoUri)) {
    warnings.push('MONGODB_URI contient une valeur placeholder — synchronisation cloud désactivée.')
  }

  // ── PORT ───────────────────────────────────────────────────────────────────
  const port = process.env.PORT
  if (port && isNaN(Number(port))) {
    errors.push(`PORT invalide : "${port}". Doit être un nombre.`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Valide l'environnement et arrête le processus si des erreurs critiques existent.
 * Affiche les warnings sans bloquer.
 */
export function assertEnv(): void {
  const result = validateEnv()

  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => console.warn(`[Env] ⚠️  ${w}`))
  }

  if (!result.valid) {
    console.error('[Env] ✗ Variables d\'environnement invalides :')
    result.errors.forEach((e) => console.error(`  - ${e}`))
    console.error('[Env] Copiez .env.example en .env et remplissez les valeurs.')
    process.exit(1)
  }

  console.log('[Env] ✓ Variables d\'environnement validées')
}

// ─── Accesseurs typés ─────────────────────────────────────────────────────────
// Utiliser ces fonctions plutôt que process.env directement dans le code.

/** Secret JWT — garanti non-null après assertEnv() */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('[Env] JWT_SECRET non défini — appelez assertEnv() au démarrage')
  return secret
}

/** Clé de chiffrement AES — garantie non-null après assertEnv() */
export function getEncryptionKey(): string {
  const key = process.env.DATA_ENCRYPTION_KEY
  if (!key) throw new Error('[Env] DATA_ENCRYPTION_KEY non définie — appelez assertEnv() au démarrage')
  return key
}

/** URI MongoDB Atlas — peut être null (mode offline) */
export function getMongoUri(): string | null {
  const uri = process.env.MONGODB_URI
  if (!uri || uri.trim() === '' || isPlaceholder(uri)) return null
  return uri
}

/** Port du serveur */
export function getPort(): number {
  return Number(process.env.PORT) || 3001
}

/** Environnement courant */
export function getNodeEnv(): 'development' | 'production' | 'test' {
  const env = process.env.NODE_ENV
  if (env === 'production' || env === 'test') return env
  return 'development'
}

/** Vrai si on est en développement */
export function isDev(): boolean {
  return getNodeEnv() === 'development'
}
