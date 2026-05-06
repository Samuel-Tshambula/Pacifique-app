/**
 * global.d.ts
 * Déclarations TypeScript pour les APIs globales injectées par Electron.
 */

interface AppConfig {
  role: 'server' | 'client'
  screen: 'reception' | 'kitchen' | 'admin'
  serverUrl: string
}

interface ConfigValidationResult {
  valid: boolean
  errors: string[]
  config?: AppConfig
}

interface ConfigSaveResult {
  success: boolean
  errors: string[]
  config?: AppConfig
}

interface ElectronAPI {
  // ── Système ────────────────────────────────────────────────────────────────
  platform: string

  // ── Impression ─────────────────────────────────────────────────────────────
  printTicket: () => Promise<{ success: boolean }>

  // ── Configuration ──────────────────────────────────────────────────────────
  /** Récupère la config runtime depuis config.json */
  getConfig: () => Promise<AppConfig>
  /** Valide une config sans la sauvegarder */
  validateConfig: (config: Partial<AppConfig>) => Promise<ConfigValidationResult>
  /** Sauvegarde une nouvelle config dans config.json */
  saveConfig: (config: Partial<AppConfig>) => Promise<ConfigSaveResult>
  /** Ouvre un dialog pour importer un config.json */
  openConfigDialog: () => Promise<AppConfig | null>
  /** Écoute les mises à jour de config (rechargement à chaud) */
  onConfigUpdated: (callback: (config: AppConfig) => void) => () => void
}

declare global {
  interface Window {
    /** API Electron exposée via contextBridge */
    api?: ElectronAPI
    /** URL du serveur Socket.IO + API (injectée par main.cjs) */
    __SERVER_URL__?: string
    /** Rôle de cette instance (server | client) */
    __APP_ROLE__?: 'server' | 'client'
    /** Écran configuré (reception | kitchen | admin) */
    __APP_SCREEN__?: 'reception' | 'kitchen' | 'admin'
  }
}

export {}
