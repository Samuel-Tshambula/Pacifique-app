/**
 * electron/main.cjs
 * Process principal Electron.
 *
 * Responsabilités :
 *  - Charger et valider config.json au démarrage
 *  - Démarrer le serveur Express + Socket.IO si role = "server"
 *  - Créer la fenêtre principale et injecter la config dans le renderer
 *  - Exposer les handlers IPC (print, get-config, save-config, validate-config)
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development'

let mainWindow = null
let serverProcess = null

// ─── Helpers config (CJS — pas d'import ESM ici) ─────────────────────────────

const VALID_ROLES = ['server', 'client']
const VALID_SCREENS = ['reception', 'kitchen', 'admin']

function resolveConfigPath() {
  // Production Electron packagée
  if (!isDev && process.resourcesPath) {
    const prodPath = path.join(process.resourcesPath, 'config.json')
    if (fs.existsSync(prodPath)) return prodPath
  }
  // Développement : racine du projet
  const devPath = path.join(__dirname, '../config.json')
  if (fs.existsSync(devPath)) return devPath
  // Fallback : répertoire courant
  const cwdPath = path.join(process.cwd(), 'config.json')
  if (fs.existsSync(cwdPath)) return cwdPath

  return devPath // Sera créé si nécessaire
}

function validateConfig(obj) {
  const errors = []
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['config.json doit contenir un objet JSON valide.'] }
  }
  if (!obj.role || !VALID_ROLES.includes(obj.role)) {
    errors.push(`"role" invalide : "${obj.role}". Valeurs : ${VALID_ROLES.join(', ')}`)
  }
  if (!obj.screen || !VALID_SCREENS.includes(obj.screen)) {
    errors.push(`"screen" invalide : "${obj.screen}". Valeurs : ${VALID_SCREENS.join(', ')}`)
  }
  if (!obj.serverUrl || typeof obj.serverUrl !== 'string') {
    errors.push('"serverUrl" manquant ou invalide. Exemple : "http://192.168.1.10:3001"')
  } else {
    try {
      new URL(obj.serverUrl)
    } catch {
      errors.push(`"serverUrl" n'est pas une URL valide : "${obj.serverUrl}"`)
    }
  }
  return { valid: errors.length === 0, errors }
}

function loadConfig() {
  const configPath = resolveConfigPath()

  if (!fs.existsSync(configPath)) {
    console.warn('[Main] config.json introuvable — création avec valeurs par défaut')
    const defaults = { role: 'server', screen: 'reception', serverUrl: 'http://localhost:3001' }
    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), 'utf-8')
    return defaults
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw)
    const validation = validateConfig(parsed)

    if (!validation.valid) {
      console.error('[Main] config.json invalide :\n', validation.errors.join('\n'))
      // On continue avec les valeurs lues (partiellement valides) plutôt que de bloquer
    }

    // Normaliser : supprimer le slash final de serverUrl
    if (parsed.serverUrl) {
      parsed.serverUrl = parsed.serverUrl.replace(/\/$/, '')
    }

    console.log('[Main] Config chargée :', parsed)
    return parsed
  } catch (err) {
    console.error('[Main] Erreur lecture config.json :', err.message)
    return { role: 'server', screen: 'reception', serverUrl: 'http://localhost:3001' }
  }
}

// ─── Chargement initial ───────────────────────────────────────────────────────

let appConfig = loadConfig()

// ─── Démarrage conditionnel du serveur ────────────────────────────────────────

function startServerIfNeeded() {
  if (appConfig.role !== 'server') {
    console.log('[Main] Rôle "client" — serveur non démarré sur cette machine')
    console.log(`[Main] Ce client se connectera à : ${appConfig.serverUrl}`)
    return
  }

  console.log('[Main] Rôle "server" — démarrage du serveur Express + Socket.IO...')

  const { fork } = require('child_process')
  let serverPath

  if (isDev) {
    // Développement : utiliser tsx pour exécuter le TypeScript directement
    // On cherche tsx dans node_modules/.bin
    const tsxBin = path.join(__dirname, '../node_modules/.bin/tsx')
    const serverTs = path.join(__dirname, '../server/index.ts')

    if (!fs.existsSync(serverTs)) {
      console.warn('[Main] server/index.ts introuvable')
      return
    }

    serverProcess = fork(tsxBin, [serverTs], {
      env: { ...process.env, NODE_ENV: 'development' },
      silent: false,
    })
  } else {
    // Production : serveur compilé
    serverPath = path.join(__dirname, '../dist-server/server/index.js')

    if (!fs.existsSync(serverPath)) {
      console.warn('[Main] dist-server/server/index.js introuvable')
      console.warn('[Main] Exécutez : npm run build:server')
      return
    }

    serverProcess = fork(serverPath, [], {
      env: { ...process.env, NODE_ENV: 'production' },
      silent: false,
    })
  }

  serverProcess.on('error', (err) => console.error('[Main] Erreur serveur :', err.message))
  serverProcess.on('exit', (code, signal) => {
    console.log(`[Main] Serveur arrêté (code: ${code}, signal: ${signal})`)
    serverProcess = null
  })

  console.log(`[Main] Serveur démarré (PID: ${serverProcess.pid})`)
}

// ─── Création de la fenêtre ───────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1366,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: 'Hôtel Pacifique',
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    injectConfigIntoRenderer()
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

/**
 * Injecte la config dans window.* du renderer.
 * Permet au client Socket.IO et à api.ts de connaître l'URL du serveur
 * sans aucune valeur codée en dur dans le code React.
 */
function injectConfigIntoRenderer() {
  if (!mainWindow) return
  mainWindow.webContents.executeJavaScript(`
    window.__SERVER_URL__  = ${JSON.stringify(appConfig.serverUrl)};
    window.__APP_ROLE__    = ${JSON.stringify(appConfig.role)};
    window.__APP_SCREEN__  = ${JSON.stringify(appConfig.screen)};
    console.log('[Renderer] Config injectée :', window.__APP_ROLE__, window.__APP_SCREEN__, window.__SERVER_URL__);
  `).catch((err) => console.warn('[Main] Injection config échouée :', err.message))
}

// ─── Watcher config.json ──────────────────────────────────────────────────────

function watchConfigFile() {
  const configPath = resolveConfigPath()
  if (!fs.existsSync(configPath)) return

  let debounceTimer = null

  fs.watch(configPath, { persistent: false }, (event) => {
    if (event !== 'change') return
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      console.log('[Main] config.json modifié — rechargement...')
      appConfig = loadConfig()
      injectConfigIntoRenderer()
      // Notifier le renderer
      if (mainWindow) {
        mainWindow.webContents.send('config-updated', appConfig)
      }
    }, 300)
  })

  console.log('[Main] Watcher config.json actif')
}

// ─── Handlers IPC ─────────────────────────────────────────────────────────────

/** Impression du ticket */
ipcMain.handle('print-ticket', async () => {
  if (!mainWindow) throw new Error('Fenêtre principale introuvable')
  return new Promise((resolve, reject) => {
    mainWindow.webContents.print(
      { silent: false, printBackground: true },
      (success, failureReason) => {
        if (success) resolve({ success: true })
        else reject(new Error(failureReason || 'Impression annulée'))
      }
    )
  })
})

/** Retourne la config actuelle */
ipcMain.handle('get-config', () => appConfig)

/** Valide une config sans la sauvegarder */
ipcMain.handle('validate-config', (_event, newConfig) => {
  return validateConfig(newConfig)
})

/**
 * Sauvegarde une nouvelle config dans config.json.
 * Crée une sauvegarde .bak avant d'écrire.
 * Retourne { success, errors } au renderer.
 */
ipcMain.handle('save-config', (_event, newConfig) => {
  const validation = validateConfig(newConfig)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const configPath = resolveConfigPath()

  try {
    // Sauvegarde de l'ancienne config
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, `${configPath}.bak`)
    }

    // Normaliser serverUrl
    const toSave = {
      ...newConfig,
      serverUrl: newConfig.serverUrl.replace(/\/$/, ''),
    }

    fs.writeFileSync(configPath, JSON.stringify(toSave, null, 2), 'utf-8')
    appConfig = toSave
    injectConfigIntoRenderer()

    console.log('[Main] Config sauvegardée :', toSave)
    return { success: true, errors: [], config: toSave }
  } catch (err) {
    return { success: false, errors: [`Erreur écriture : ${err.message}`] }
  }
})

/**
 * Ouvre une boîte de dialogue pour choisir l'emplacement de config.json
 * (utile pour les déploiements sur des chemins personnalisés).
 */
ipcMain.handle('open-config-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Sélectionner config.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
})

// ─── Cycle de vie Electron ────────────────────────────────────────────────────

app.whenReady().then(() => {
  startServerIfNeeded()
  createWindow()
  watchConfigFile()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
