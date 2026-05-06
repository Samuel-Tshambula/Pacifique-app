/**
 * electron/preload.cjs
 * Bridge sécurisé entre le process principal et le renderer React.
 * Expose uniquement les APIs nécessaires via contextBridge.
 * contextIsolation = true → aucun accès direct à Node.js depuis React.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // ── Système ──────────────────────────────────────────────────────────────
  platform: process.platform,

  // ── Impression ───────────────────────────────────────────────────────────
  /** Déclenche l'impression du ticket via Electron */
  printTicket: () => ipcRenderer.invoke('print-ticket'),

  // ── Configuration ─────────────────────────────────────────────────────────
  /** Récupère la configuration runtime actuelle (config.json) */
  getConfig: () => ipcRenderer.invoke('get-config'),

  /** Valide une config sans la sauvegarder — retourne { valid, errors } */
  validateConfig: (config) => ipcRenderer.invoke('validate-config', config),

  /** Sauvegarde une nouvelle config dans config.json — retourne { success, errors, config } */
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  /** Ouvre un dialog pour importer un config.json existant */
  openConfigDialog: () => ipcRenderer.invoke('open-config-dialog'),

  /** Écoute les mises à jour de config (rechargement à chaud) */
  onConfigUpdated: (callback) => {
    ipcRenderer.on('config-updated', (_event, config) => callback(config))
    // Retourne une fonction de nettoyage
    return () => ipcRenderer.removeAllListeners('config-updated')
  },
})
