/**
 * config/configManager.ts
 * Gestion complète de la configuration runtime.
 *
 * Responsabilités :
 *  - Résoudre le chemin de config.json (prod Electron / dev)
 *  - Valider le schéma avec messages d'erreur explicites
 *  - Charger (singleton) / recharger / sauvegarder
 *  - Watcher pour rechargement à chaud (dev)
 *
 * Aucune valeur codée en dur — tout vient de config.json ou du .env.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppConfig {
  /** "server" = cette machine héberge Express + Socket.IO */
  role: 'server' | 'client'
  /** Écran par défaut affiché après login (info pour l'UI) */
  screen: 'reception' | 'kitchen' | 'admin'
  /** URL complète du serveur Socket.IO + API (ex: http://192.168.1.10:3001) */
  serverUrl: string
}

export interface ConfigValidationResult {
  valid: boolean
  errors: string[]
  config?: AppConfig
}

// ─── Valeurs autorisées ───────────────────────────────────────────────────────

const VALID_ROLES = ['server', 'client'] as const
const VALID_SCREENS = ['reception', 'kitchen', 'admin'] as const

// ─── État interne ─────────────────────────────────────────────────────────────

let _config: AppConfig | null = null
let _configPath: string | null = null
let _watcher: fs.FSWatcher | null = null

// ─── Résolution du chemin ─────────────────────────────────────────────────────

/**
 * Résout le chemin absolu vers config.json.
 * Ordre de priorité :
 *   1. process.resourcesPath/config.json  (production Electron packagée)
 *   2. __dirname/../config.json           (développement)
 */
export function resolveConfigPath(): string {
  // Production Electron : le fichier est dans resources/ (extraResources dans electron-builder)
  if (process.env.NODE_ENV !== 'development') {
    const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath
    if (resourcesPath) {
      const prodPath = path.join(resourcesPath, 'config.json')
      if (fs.existsSync(prodPath)) return prodPath
    }
  }

  // Développement : racine du projet (un niveau au-dessus de /config)
  const devPath = path.resolve(__dirname, '../config.json')
  if (fs.existsSync(devPath)) return devPath

  // Dernier recours : répertoire courant
  const cwdPath = path.resolve(process.cwd(), 'config.json')
  if (fs.existsSync(cwdPath)) return cwdPath

  throw new Error(
    '[Config] config.json introuvable.\n' +
    `  Chemins testés :\n` +
    `  - ${path.join((process as any).resourcesPath || '<resourcesPath>', 'config.json')}\n` +
    `  - ${path.resolve(__dirname, '../config.json')}\n` +
    `  - ${path.resolve(process.cwd(), 'config.json')}\n` +
    `  Créez un fichier config.json à la racine du projet.`
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Valide un objet config et retourne les erreurs détaillées.
 * Ne lève jamais d'exception — retourne toujours un résultat.
 */
export function validateConfig(raw: unknown): ConfigValidationResult {
  const errors: string[] = []

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Le fichier config.json doit contenir un objet JSON valide.'] }
  }

  const obj = raw as Record<string, unknown>

  // Validation : role
  if (!obj.role) {
    errors.push(`Champ "role" manquant. Valeurs acceptées : ${VALID_ROLES.join(', ')}`)
  } else if (!VALID_ROLES.includes(obj.role as any)) {
    errors.push(`Champ "role" invalide : "${obj.role}". Valeurs acceptées : ${VALID_ROLES.join(', ')}`)
  }

  // Validation : screen
  if (!obj.screen) {
    errors.push(`Champ "screen" manquant. Valeurs acceptées : ${VALID_SCREENS.join(', ')}`)
  } else if (!VALID_SCREENS.includes(obj.screen as any)) {
    errors.push(`Champ "screen" invalide : "${obj.screen}". Valeurs acceptées : ${VALID_SCREENS.join(', ')}`)
  }

  // Validation : serverUrl
  if (!obj.serverUrl) {
    errors.push('Champ "serverUrl" manquant. Exemple : "http://192.168.1.10:3001"')
  } else if (typeof obj.serverUrl !== 'string') {
    errors.push('Champ "serverUrl" doit être une chaîne de caractères.')
  } else {
    try {
      const url = new URL(obj.serverUrl as string)
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push(`Champ "serverUrl" : protocole invalide "${url.protocol}". Utilisez http:// ou https://`)
      }
    } catch {
      errors.push(`Champ "serverUrl" invalide : "${obj.serverUrl}". Exemple : "http://192.168.1.10:3001"`)
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    config: {
      role: obj.role as AppConfig['role'],
      screen: obj.screen as AppConfig['screen'],
      serverUrl: (obj.serverUrl as string).replace(/\/$/, ''), // Supprimer le slash final
    },
  }
}

// ─── Chargement ───────────────────────────────────────────────────────────────

/**
 * Charge config.json et valide son contenu.
 * Singleton : retourne la config en cache si déjà chargée.
 * Lève une erreur explicite si le fichier est absent, malformé ou invalide.
 */
export function loadConfig(): AppConfig {
  if (_config) return _config

  _configPath = resolveConfigPath()

  let raw: unknown
  try {
    const content = fs.readFileSync(_configPath, 'utf-8')
    raw = JSON.parse(content)
  } catch (err) {
    throw new Error(
      `[Config] Impossible de lire config.json (${_configPath}) :\n  ${(err as Error).message}`
    )
  }

  const result = validateConfig(raw)
  if (!result.valid) {
    throw new Error(
      `[Config] config.json invalide (${_configPath}) :\n` +
      result.errors.map((e) => `  - ${e}`).join('\n')
    )
  }

  _config = result.config!
  console.log(`[Config] ✓ Chargé depuis : ${_configPath}`)
  console.log(`[Config]   role=${_config.role} | screen=${_config.screen} | serverUrl=${_config.serverUrl}`)
  return _config
}

/**
 * Retourne la config (charge si nécessaire).
 */
export function getConfig(): AppConfig {
  if (!_config) return loadConfig()
  return _config
}

/**
 * Recharge la config depuis le disque (invalide le cache).
 */
export function reloadConfig(): AppConfig {
  _config = null
  return loadConfig()
}

// ─── Sauvegarde ───────────────────────────────────────────────────────────────

/**
 * Valide et sauvegarde une nouvelle configuration dans config.json.
 * Crée une sauvegarde config.json.bak avant d'écrire.
 * @returns Le résultat de validation (avec erreurs si invalide)
 */
export function saveConfig(newConfig: unknown): ConfigValidationResult {
  const result = validateConfig(newConfig)
  if (!result.valid) return result

  const targetPath = _configPath || resolveConfigPath()

  // Sauvegarde de l'ancienne config
  if (fs.existsSync(targetPath)) {
    fs.copyFileSync(targetPath, `${targetPath}.bak`)
  }

  try {
    fs.writeFileSync(targetPath, JSON.stringify(result.config, null, 2), 'utf-8')
    _config = result.config!
    console.log(`[Config] ✓ Sauvegardé dans : ${targetPath}`)
    return result
  } catch (err) {
    return {
      valid: false,
      errors: [`Impossible d'écrire config.json : ${(err as Error).message}`],
    }
  }
}

// ─── Watcher (rechargement à chaud) ──────────────────────────────────────────

type ConfigChangeCallback = (config: AppConfig) => void

/**
 * Surveille config.json et appelle le callback à chaque modification.
 * Utile en développement pour recharger sans redémarrer.
 */
export function watchConfig(onChange: ConfigChangeCallback): void {
  if (_watcher) return // Déjà actif

  const targetPath = _configPath || resolveConfigPath()

  _watcher = fs.watch(targetPath, { persistent: false }, (event) => {
    if (event !== 'change') return

    // Délai pour éviter les lectures partielles (debounce 200ms)
    setTimeout(() => {
      try {
        _config = null
        const updated = loadConfig()
        console.log('[Config] Rechargé automatiquement')
        onChange(updated)
      } catch (err) {
        console.warn('[Config] Rechargement échoué :', (err as Error).message)
      }
    }, 200)
  })

  console.log(`[Config] Watcher actif sur : ${targetPath}`)
}

/**
 * Arrête le watcher.
 */
export function unwatchConfig(): void {
  if (_watcher) {
    _watcher.close()
    _watcher = null
    console.log('[Config] Watcher arrêté')
  }
}
