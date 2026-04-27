import { useEffect, useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { UserPlus, Unlock, Power, Pencil, X, Check } from 'lucide-react'
import './Utilisateurs.css'

const ROLES = ['serveur', 'cuisinier', 'receptionniste', 'gestionnaire', 'comptable', 'admin']

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur', serveur: 'Serveur', cuisinier: 'Cuisinier',
  receptionniste: 'Réceptionniste', gestionnaire: 'Gestionnaire', comptable: 'Comptable',
}

const ROLE_ICONS: Record<string, string> = {
  admin: '👑', serveur: '🍽️', cuisinier: '👨🍳',
  receptionniste: '🏨', gestionnaire: '📊', comptable: '💼',
}

interface Utilisateur {
  id: string
  name: string
  username: string
  role: string
  isActive: boolean
  failedAttempts: number
  lockedUntil: string | null
  lastLogin: string | null
  createdAt: string
}

const EMPTY_FORM = { name: '', username: '', password: '', role: 'serveur' }

export default function Utilisateurs() {
  const [users, setUsers] = useState<Utilisateur[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function fetchUsers() {
    const { data } = await api.get('/utilisateurs')
    setUsers(data)
  }

  useEffect(() => { fetchUsers() }, [])

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowPassword(false)
    setShowForm(true)
  }

  function openEdit(u: Utilisateur) {
    setEditId(u.id)
    setForm({ name: u.name, username: u.username, password: '', role: u.role })
    setShowPassword(false)
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!form.name || !form.username || (!editId && !form.password))
      return toast.error('Remplissez tous les champs obligatoires')

    setLoading(true)
    try {
      if (editId) {
        await api.patch(`/utilisateurs/${editId}`, form)
        toast.success('Employé modifié')
      } else {
        await api.post('/utilisateurs', form)
        toast.success('Employé créé')
      }
      setShowForm(false)
      fetchUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActif(u: Utilisateur) {
    await api.patch(`/utilisateurs/${u.id}`, { isActive: !u.isActive })
    toast.success(u.isActive ? 'Compte désactivé' : 'Compte activé')
    fetchUsers()
  }

  async function debloquer(u: Utilisateur) {
    await api.patch(`/utilisateurs/${u.id}`, { unlock: true })
    toast.success('Compte déverrouillé')
    fetchUsers()
  }

  const isLocked = (u: Utilisateur) => u.lockedUntil && new Date(u.lockedUntil) > new Date()

  return (
    <div className="users-page">
      <div className="users-header">
        <div>
          <h2>Gestion des employés</h2>
          <p>{users.length} employé(s) enregistré(s)</p>
        </div>
        <button className="btn-add" onClick={openCreate}>
          <UserPlus size={18} />
          Nouvel employé
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? "Modifier l'employé" : 'Nouvel employé'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nom complet *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ex: Jean Dupont"
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label>Nom d'utilisateur *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="ex: jean.dupont"
                  autoComplete="off"
                />
                <span className="field-hint">Ce nom sera utilisé pour se connecter</span>
              </div>

              <div className="form-group">
                <label>Mot de passe {editId ? '(laisser vide pour ne pas changer)' : '*'}</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                  />
                  <span>Afficher le mot de passe</span>
                </label>
              </div>

              <div className="form-group">
                <label>Rôle *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_ICONS[r]} {ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowForm(false)}>Annuler</button>
              <button className="btn-save" onClick={handleSubmit} disabled={loading}>
                <Check size={16} />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-grid">
        {users.map((u) => (
          <div key={u.id} className={`user-card ${!u.isActive ? 'inactive' : ''} ${isLocked(u) ? 'locked' : ''}`}>
            <div className="user-card-header">
              <div className="user-avatar-big">{ROLE_ICONS[u.role]}</div>
              <div className="user-card-info">
                <div className="user-card-name">{u.name}</div>
                <div className="user-card-username">@{u.username}</div>
                <div className="user-card-role">{ROLE_LABELS[u.role]}</div>
              </div>
              <div className="user-card-badges">
                {!u.isActive && <span className="badge badge-inactive">Inactif</span>}
                {isLocked(u) && <span className="badge badge-locked">🔒 Verrouillé</span>}
                {u.isActive && !isLocked(u) && <span className="badge badge-active">Actif</span>}
              </div>
            </div>

            <div className="user-card-meta">
              Dernière connexion : {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-FR') : 'Jamais'}
            </div>

            <div className="user-card-actions">
              <button className="btn-icon btn-edit" onClick={() => openEdit(u)} title="Modifier">
                <Pencil size={15} />
              </button>
              {isLocked(u) && (
                <button className="btn-icon btn-unlock" onClick={() => debloquer(u)} title="Déverrouiller">
                  <Unlock size={15} />
                </button>
              )}
              {!isLocked(u) && u.isActive && (
                <button className="btn-icon btn-lock" onClick={() => toggleActif(u)} title="Désactiver">
                  <Power size={15} />
                </button>
              )}
              {!u.isActive && (
                <button className="btn-icon btn-activate" onClick={() => toggleActif(u)} title="Activer">
                  <Power size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
