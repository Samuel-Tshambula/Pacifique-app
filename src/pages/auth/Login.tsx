import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import './Login.css'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur', serveur: 'Serveur', cuisinier: 'Cuisinier',
  receptionniste: 'Réceptionniste', gestionnaire: 'Gestionnaire', comptable: 'Comptable',
}

const ROLE_ICONS: Record<string, string> = {
  admin: '👑', serveur: '🍽️', cuisinier: '👨🍳',
  receptionniste: '🏨', gestionnaire: '📊', comptable: '💼',
}

const REDIRECTS: Record<string, string> = {
  admin: '/dashboard', gestionnaire: '/dashboard', comptable: '/dashboard',
  serveur: '/ventes', cuisinier: '/cuisine', receptionniste: '/hebergement',
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [connectedUser, setConnectedUser] = useState<{ name: string; role: string } | null>(null)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const role = await login(username, password)
      const user = useAuthStore.getState().user
      setConnectedUser({ name: user?.name || '', role })
      setTimeout(() => navigate(REDIRECTS[role] || '/dashboard'), 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

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
        <div className="login-card">
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

              <form onSubmit={handleSubmit} className="login-form">
                {error && (
                  <div className="login-error">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="username">Nom d'utilisateur</label>
                  <div className="input-wrapper">
                    <span className="input-icon">👤</span>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ex: jean.dupont"
                      autoComplete="off"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password">Mot de passe</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
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
                </div>

                <button type="submit" className="btn-login" disabled={loading}>
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
