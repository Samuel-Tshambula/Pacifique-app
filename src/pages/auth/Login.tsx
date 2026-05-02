import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import './Login.css'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur', serveur: 'Serveur', cuisinier: 'Cuisinier',
  receptionniste: 'Réceptionniste', gestionnaire: 'Gestionnaire', comptable: 'Comptable',
}

const ROLE_ICONS: Record<string, string> = {
  admin: '👑', serveur: '🍽️', cuisinier: '👨‍🍳',
  receptionniste: '🏨', gestionnaire: '📊', comptable: '💼',
}

const REDIRECTS: Record<string, string> = {
  admin: '/dashboard', gestionnaire: '/dashboard', comptable: '/dashboard',
  serveur: '/ventes', cuisinier: '/cuisine', receptionniste: '/hebergement',
}

interface FieldErrors {
  username?: string
  password?: string
}

type ErrorType = 'credentials' | 'locked' | 'disabled' | 'network' | 'generic'

function classifyError(msg: string): ErrorType {
  if (!msg) return 'generic'
  if (msg.includes('verrouillé')) return 'locked'
  if (msg.includes('désactivé')) return 'disabled'
  if (msg.includes('Identifiants') || msg.includes('incorrects')) return 'credentials'
  if (msg.includes('réseau') || msg.includes('Network') || msg.includes('ECONNREFUSED')) return 'network'
  return 'generic'
}

const ERROR_CONFIG: Record<ErrorType, { icon: string; color: string; bg: string; border: string }> = {
  credentials: { icon: '🔑', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  locked:      { icon: '🔒', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  disabled:    { icon: '🚫', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
  network:     { icon: '📡', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  generic:     { icon: '⚠️', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

function validate(username: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!username.trim()) {
    errors.username = 'Le nom d\'utilisateur est requis'
  } else if (username.trim().length < 3) {
    errors.username = 'Minimum 3 caractères'
  } else if (/\s/.test(username)) {
    errors.username = 'Aucun espace autorisé'
  }
  if (!password) {
    errors.password = 'Le mot de passe est requis'
  } else if (password.length < 4) {
    errors.password = 'Minimum 4 caractères'
  }
  return errors
}

export default function Login() {
  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [fieldErrors, setFieldErrors]   = useState<FieldErrors>({})
  const [touched, setTouched]           = useState<Record<string, boolean>>({})
  const [serverError, setServerError]   = useState('')
  const [errorType, setErrorType]       = useState<ErrorType>('generic')
  const [loading, setLoading]           = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [connectedUser, setConnectedUser] = useState<{ name: string; role: string } | null>(null)
  const [attempts, setAttempts]         = useState(0)
  const [shake, setShake]               = useState(false)

  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  function handleBlur(field: string) {
    setTouched((t) => ({ ...t, [field]: true }))
    const errs = validate(username, password)
    setFieldErrors(errs)
  }

  function handleChangeUsername(val: string) {
    setUsername(val)
    if (touched.username) {
      const errs = validate(val, password)
      setFieldErrors((f) => ({ ...f, username: errs.username }))
    }
  }

  function handleChangePassword(val: string) {
    setPassword(val)
    if (touched.password) {
      const errs = validate(username, val)
      setFieldErrors((f) => ({ ...f, password: errs.password }))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ username: true, password: true })

    const errs = validate(username, password)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setServerError('')
    setErrorType('generic')
    setLoading(true)

    try {
      const role = await login(username.trim(), password)
      const user = useAuthStore.getState().user
      setLoading(false)
      setConnectedUser({ name: user?.name || '', role })
      setTimeout(() => navigate(REDIRECTS[role] || '/dashboard'), 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Erreur de connexion'

      const type = classifyError(msg)
      setLoading(false)
      setErrorType(type)
      setServerError(msg)
      setAttempts((a) => a + 1)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  const errCfg = ERROR_CONFIG[errorType]
  const isFormDirty = username.length > 0 || password.length > 0

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-brand">
          <div className="brand-icon">🏨</div>
          <h1>Hôtel Pacifique</h1>
          <p>Système de gestion intégré</p>
        </div>
        <div className="login-features">
          <div className="feature-item"><span>🍽️</span><span>Restaurant & Bar</span></div>
          <div className="feature-item"><span>🛏️</span><span>Hébergement</span></div>
          <div className="feature-item"><span>📦</span><span>Gestion du stock</span></div>
          <div className="feature-item"><span>📊</span><span>Tableau de bord</span></div>
        </div>
      </div>

      <div className="login-right">
        <div className={`login-card ${shake ? 'shake' : ''}`}>
          {connectedUser ? (
            <div className="login-success">
              <div className="success-icon">{ROLE_ICONS[connectedUser.role] || '👤'}</div>
              <h2>Bienvenue !</h2>
              <p className="success-name">{connectedUser.name}</p>
              <p className="success-role">{ROLE_LABELS[connectedUser.role]}</p>
              <div className="success-loader"><div className="loader-bar" /></div>
              <p className="success-redirect">Redirection en cours...</p>
            </div>
          ) : (
            <>
              <div className="login-header">
                <h2>Connexion</h2>
                <p>Entrez vos identifiants pour accéder à votre espace</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form" noValidate>

                {/* ERREUR SERVEUR */}
                {serverError && (
                  <div
                    className="login-error-box"
                    style={{ background: errCfg.bg, borderColor: errCfg.border, color: errCfg.color }}
                  >
                    <span className="error-icon">{errCfg.icon}</span>
                    <div className="error-content">
                      <span className="error-msg">{serverError}</span>
                      {errorType === 'credentials' && attempts >= 2 && (
                        <span className="error-hint">
                          Attention : votre compte sera verrouillé après 3 tentatives échouées.
                        </span>
                      )}
                      {errorType === 'locked' && (
                        <span className="error-hint">
                          Contactez l'administrateur pour déverrouiller votre compte.
                        </span>
                      )}
                      {errorType === 'network' && (
                        <span className="error-hint">
                          Vérifiez que le serveur est démarré et réessayez.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* CHAMP USERNAME */}
                <div className="form-group">
                  <label htmlFor="username">Nom d'utilisateur</label>
                  <div className={`input-wrapper ${touched.username && fieldErrors.username ? 'input-error' : touched.username && !fieldErrors.username && username ? 'input-valid' : ''}`}>
                    <span className="input-icon">👤</span>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => handleChangeUsername(e.target.value)}
                      onBlur={() => handleBlur('username')}
                      placeholder="ex: jean.dupont"
                      autoComplete="off"
                      autoFocus
                    />
                    {touched.username && !fieldErrors.username && username && (
                      <span className="input-check">✓</span>
                    )}
                  </div>
                  {touched.username && fieldErrors.username && (
                    <span className="field-error">⚠ {fieldErrors.username}</span>
                  )}
                </div>

                {/* CHAMP PASSWORD */}
                <div className="form-group">
                  <label htmlFor="password">Mot de passe</label>
                  <div className={`input-wrapper ${touched.password && fieldErrors.password ? 'input-error' : touched.password && !fieldErrors.password && password ? 'input-valid' : ''}`}>
                    <span className="input-icon">🔒</span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => handleChangePassword(e.target.value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={() => setShowPassword(!showPassword)}
                    />
                    <span>Afficher le mot de passe</span>
                  </label>
                  {touched.password && fieldErrors.password && (
                    <span className="field-error">⚠ {fieldErrors.password}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-login"
                  disabled={loading || !isFormDirty}
                >
                  {loading ? (
                    <span className="btn-loading">
                      <span className="spinner" />
                      Vérification...
                    </span>
                  ) : 'Se connecter'}
                </button>
              </form>

              <div className="login-footer">
                <p>Compte verrouillé ? Contactez l'administrateur</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
