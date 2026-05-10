/**
 * src/pages/config/Configuration.tsx
 * Page de configuration runtime — accessible uniquement aux admins.
 * Permet de modifier config.json sans toucher au fichier manuellement.
 */

import { useState, useEffect } from 'react'
import { useConfigStore } from '../../store/configStore'
import { Monitor, Server, Wifi, Save, RefreshCw, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react'
import './Configuration.css'

// ─── Types locaux ─────────────────────────────────────────────────────────────

import type { AppRole, AppScreen } from '../../types'

type FormState = {
  role: AppRole
  screen: AppScreen
  serverUrl: string
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Configuration() {
  const { config, isLoaded, isSaving, errors, loadConfig, saveConfig, validateConfig, clearErrors } =
    useConfigStore()

  const [form, setForm] = useState<FormState>({
    role: 'server',
    screen: 'reception',
    serverUrl: 'http://localhost:3001',
  })
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  // Synchroniser le formulaire avec la config chargée
  useEffect(() => {
    if (config) {
      setForm({
        role: config.role,
        screen: config.screen,
        serverUrl: config.serverUrl || 'http://localhost:3001',
      })
    }
  }, [config])

  // Recharger la config au montage
  useEffect(() => {
    if (!isLoaded) loadConfig()
  }, [isLoaded, loadConfig])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
    clearErrors()
    setValidationErrors([])
  }

  const handleValidate = async () => {
    setIsValidating(true)
    setValidationErrors([])
    const result = await validateConfig(form)
    setValidationErrors(result.errors)
    setIsValidating(false)
  }

  const handleSave = async () => {
    setSaveSuccess(false)
    clearErrors()
    setValidationErrors([])

    const result = await saveConfig(form)
    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } else {
      setValidationErrors(result.errors)
    }
  }

  const handleImport = async () => {
    if (!window.api?.openConfigDialog) return
    const imported = await window.api.openConfigDialog()
    if (imported) {
      setForm({
        role: imported.role || 'server',
        screen: imported.screen || 'reception',
        serverUrl: imported.serverUrl || '',
      })
      setSaveSuccess(false)
      clearErrors()
    }
  }

  const handleReload = async () => {
    setSaveSuccess(false)
    clearErrors()
    setValidationErrors([])
    await loadConfig()
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────

  const allErrors = [...validationErrors, ...errors]

  return (
    <div className="config-page">
      <div className="config-header">
        <div className="config-header-title">
          <Monitor size={24} />
          <div>
            <h1>Configuration système</h1>
            <p>Paramètres runtime de cette instance — modifie config.json</p>
          </div>
        </div>
        <div className="config-header-actions">
          <button className="btn-secondary" onClick={handleImport} title="Importer un config.json">
            <Upload size={16} />
            Importer
          </button>
          <button className="btn-secondary" onClick={handleReload} title="Recharger depuis le disque">
            <RefreshCw size={16} />
            Recharger
          </button>
        </div>
      </div>

      {/* Bannière statut actuel */}
      {config && (
        <div className={`config-status-banner ${config.role}`}>
          <Info size={16} />
          <span>
            Configuration actuelle : <strong>{config.role === 'server' ? 'Serveur' : 'Client'}</strong>
            {' · '}
            <strong>{config.screen}</strong>
            {' · '}
            <strong>{config.serverUrl}</strong>
          </span>
        </div>
      )}

      <div className="config-form-container">
        {/* ── Rôle ──────────────────────────────────────────────────────────── */}
        <section className="config-section">
          <div className="config-section-header">
            <Server size={18} />
            <div>
              <h2>Rôle de cette machine</h2>
              <p>Détermine si cette machine héberge le serveur ou s'y connecte</p>
            </div>
          </div>

          <div className="config-role-cards">
            <label className={`config-role-card ${form.role === 'server' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="role"
                value="server"
                checked={form.role === 'server'}
                onChange={() => handleChange('role', 'server')}
              />
              <div className="config-role-card-content">
                <Server size={28} />
                <strong>Serveur</strong>
                <span>Héberge Express + Socket.IO<br />Gère les données locales</span>
                <div className="config-role-badge server">Recommandé : PC réception</div>
              </div>
            </label>

            <label className={`config-role-card ${form.role === 'client' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="role"
                value="client"
                checked={form.role === 'client'}
                onChange={() => handleChange('role', 'client')}
              />
              <div className="config-role-card-content">
                <Wifi size={28} />
                <strong>Client</strong>
                <span>Se connecte au serveur<br />via le réseau local</span>
                <div className="config-role-badge client">Cuisine, bar, admin</div>
              </div>
            </label>
          </div>
        </section>

        {/* ── Écran ─────────────────────────────────────────────────────────── */}
        <section className="config-section">
          <div className="config-section-header">
            <Monitor size={18} />
            <div>
              <h2>Écran par défaut</h2>
              <p>Information indicative — l'accès réel dépend du rôle utilisateur après login</p>
            </div>
          </div>

          <div className="config-screen-options">
            {(['reception', 'kitchen', 'admin'] as const).map((screen) => (
              <label key={screen} className={`config-screen-option ${form.screen === screen ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="screen"
                  value={screen}
                  checked={form.screen === screen}
                  onChange={() => handleChange('screen', screen)}
                />
                <span className="config-screen-label">
                  {screen === 'reception' && '🏨 Réception'}
                  {screen === 'kitchen' && '🍳 Cuisine'}
                  {screen === 'admin' && '⚙️ Administration'}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ── URL Serveur ───────────────────────────────────────────────────── */}
        <section className="config-section">
          <div className="config-section-header">
            <Wifi size={18} />
            <div>
              <h2>URL du serveur</h2>
              <p>
                {form.role === 'server'
                  ? 'URL sur laquelle ce serveur sera accessible depuis le réseau local'
                  : 'URL du serveur auquel ce client doit se connecter'}
              </p>
            </div>
          </div>

          <div className="config-url-field">
            <input
              type="url"
              value={form.serverUrl}
              onChange={(e) => handleChange('serverUrl', e.target.value)}
              placeholder="http://192.168.1.10:3001"
              className="config-url-input"
              spellCheck={false}
            />
            <div className="config-url-hint">
              {form.role === 'server'
                ? '💡 Remplacez localhost par l\'IP LAN de cette machine pour les clients distants'
                : '💡 Entrez l\'IP LAN du serveur (ex: http://192.168.1.10:3001)'}
            </div>
          </div>
        </section>

        {/* ── Erreurs ───────────────────────────────────────────────────────── */}
        {allErrors.length > 0 && (
          <div className="config-errors">
            <AlertCircle size={16} />
            <ul>
              {allErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* ── Succès ────────────────────────────────────────────────────────── */}
        {saveSuccess && (
          <div className="config-success">
            <CheckCircle size={16} />
            <span>Configuration sauvegardée. Redémarrez l'application pour appliquer les changements.</span>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div className="config-actions">
          <button
            className="btn-secondary"
            onClick={handleValidate}
            disabled={isValidating || isSaving}
          >
            {isValidating ? <RefreshCw size={16} className="spin" /> : <CheckCircle size={16} />}
            Valider
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving || isValidating}
          >
            {isSaving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {/* ── Aperçu JSON ───────────────────────────────────────────────────── */}
        <section className="config-section config-preview">
          <div className="config-section-header">
            <div>
              <h2>Aperçu config.json</h2>
              <p>Contenu qui sera écrit dans le fichier</p>
            </div>
          </div>
          <pre className="config-json-preview">
            {JSON.stringify(form, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  )
}
