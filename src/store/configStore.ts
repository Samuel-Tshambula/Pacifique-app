/**
 * src/store/configStore.ts
 * Store Zustand pour la configuration runtime.
 *
 * - Charge la config au démarrage (via IPC Electron ou window.*)
 * - Expose la config à tous les composants React
 * - Permet la mise à jour et la sauvegarde depuis l'UI
 * - Écoute les mises à jour à chaud (config-updated IPC)
 */

import { create } from 'zustand'
import type { AppConfig, ConfigValidationResult, ConfigSaveResult } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigState {
  config: AppConfig | null
  isLoaded: boolean
  isSaving: boolean
  errors: string[]

  /** Charge la config depuis Electron IPC ou window.* */
  loadConfig: () => Promise<void>

  /** Valide une config sans la sauvegarder */
  validateConfig: (config: Partial<AppConfig>) => Promise<ConfigValidationResult>

  /** Sauvegarde une nouvelle config */
  saveConfig: (config: Partial<AppConfig>) => Promise<ConfigSaveResult>

  /** Met à jour la config en mémoire (sans sauvegarder) */
  setConfig: (config: AppConfig) => void

  /** Efface les erreurs */
  clearErrors: () => void
}

// ─── Valeurs par défaut (fallback hors Electron) ──────────────────────────────

function getDefaultConfig(): AppConfig {
  return {
    role: (window.__APP_ROLE__ as AppConfig['role']) || 'server',
    screen: (window.__APP_SCREEN__ as AppConfig['screen']) || 'reception',
    serverUrl: window.__SERVER_URL__ || 'http://localhost:3001',
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoaded: false,
  isSaving: false,
  errors: [],

  loadConfig: async () => {
    try {
      let config: AppConfig

      if (window.api?.getConfig) {
        // Environnement Electron : récupérer via IPC
        config = await window.api.getConfig()

        // Écouter les mises à jour à chaud
        window.api.onConfigUpdated?.((updated) => {
          set({ config: updated })
          console.log('[ConfigStore] Config mise à jour à chaud :', updated)
        })
      } else {
        // Environnement web (dev sans Electron) : utiliser window.*
        config = getDefaultConfig()
      }

      set({ config, isLoaded: true, errors: [] })
      console.log('[ConfigStore] Config chargée :', config)
    } catch (err) {
      const msg = (err as Error).message
      console.error('[ConfigStore] Erreur chargement config :', msg)
      // Fallback sur les valeurs injectées dans window.*
      set({ config: getDefaultConfig(), isLoaded: true, errors: [msg] })
    }
  },

  validateConfig: async (newConfig) => {
    if (window.api?.validateConfig) {
      return window.api.validateConfig(newConfig)
    }
    // Validation basique côté client si pas d'Electron
    const errors: string[] = []
    if (!newConfig.role || !['server', 'client'].includes(newConfig.role)) {
      errors.push('"role" invalide. Valeurs : server, client')
    }
    if (!newConfig.screen || !['reception', 'kitchen', 'admin'].includes(newConfig.screen)) {
      errors.push('"screen" invalide. Valeurs : reception, kitchen, admin')
    }
    if (!newConfig.serverUrl) {
      errors.push('"serverUrl" manquant')
    }
    return { valid: errors.length === 0, errors, config: newConfig as AppConfig }
  },

  saveConfig: async (newConfig) => {
    set({ isSaving: true, errors: [] })

    try {
      let result: ConfigSaveResult

      if (window.api?.saveConfig) {
        result = await window.api.saveConfig(newConfig)
      } else {
        // Hors Electron : mise à jour en mémoire uniquement
        result = { success: true, errors: [], config: newConfig as AppConfig }
      }

      if (result.success && result.config) {
        set({ config: result.config, isSaving: false, errors: [] })
        console.log('[ConfigStore] Config sauvegardée :', result.config)
      } else {
        set({ isSaving: false, errors: result.errors })
      }

      return result
    } catch (err) {
      const msg = (err as Error).message
      set({ isSaving: false, errors: [msg] })
      return { success: false, errors: [msg] }
    }
  },

  setConfig: (config) => set({ config }),

  clearErrors: () => set({ errors: [] }),
}))
