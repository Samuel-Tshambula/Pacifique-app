import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { X, Check, LogIn, LogOut, Plus, Pencil } from 'lucide-react'
import './Hebergement.css'

interface Chambre {
  id: string
  numero: string
  etage: number
  type: 'simple' | 'double' | 'suite'
  prix: number
  statut: 'libre' | 'occupee' | 'nettoyage' | 'reservee'
  capacite: number
}

interface Consommation { id: string; description: string; montant: number; type: string; date: string }

interface Sejour {
  id: string; chambreId: string; chambreNumero: string
  clientNom: string; clientPrenom: string; nuits: number; prixNuit: number
  consommations: Consommation[]; statut: string
  totalHebergement: number; totalConsommations: number; dateArrivee: string
}

const STATUT_CONFIG = {
  libre:     { label: 'Libre',     color: '#22c55e', bg: '#f0fdf4' },
  occupee:   { label: 'Occupée',   color: '#ef4444', bg: '#fff5f5' },
  nettoyage: { label: 'Nettoyage', color: '#f59e0b', bg: '#fffbeb' },
  reservee:  { label: 'Réservée',  color: '#3b82f6', bg: '#eff6ff' },
}

const TYPE_LABELS = { simple: 'Simple', double: 'Double', suite: 'Suite' }
const TYPES = ['simple', 'double', 'suite'] as const
const STATUTS_RAPIDES = ['libre', 'reservee', 'nettoyage'] as const
const EMPTY_CHAMBRE = { numero: '', etage: '1', type: 'simple' as const, prix: '', capacite: '1' }

export default function Hebergement() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'gestionnaire'

  const [chambres, setChambres] = useState<Chambre[]>([])
  const [sejours, setSejours] = useState<Sejour[]>([])
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtreType, setFiltreType] = useState('tous')

  const [chambreSelectionnee, setChambreSelectionnee] = useState<Chambre | null>(null)
  const [sejourActif, setSejourActif] = useState<Sejour | null>(null)

  const [showCheckin, setShowCheckin] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showConso, setShowConso] = useState(false)
  const [showStatutRapide, setShowStatutRapide] = useState(false)
  const [showFormChambre, setShowFormChambre] = useState(false)
  const [chambreAEditer, setChambreAEditer] = useState<Chambre | null>(null)
  const [loading, setLoading] = useState(false)

  const [formCheckin, setFormCheckin] = useState({ clientNom: '', clientPrenom: '', clientPiece: '', nombrePersonnes: '1', nuits: '1' })
  const [formConso, setFormConso] = useState({ description: '', montant: '', type: 'restaurant' })
  const [formChambre, setFormChambre] = useState(EMPTY_CHAMBRE)
  const [modePaiement, setModePaiement] = useState('especes')

  async function fetchData() {
    const [c, s] = await Promise.all([api.get('/hebergement/chambres'), api.get('/hebergement/sejours')])
    setChambres(c.data)
    setSejours(s.data)
  }

  useEffect(() => { fetchData() }, [])

  function handleClickChambre(chambre: Chambre) {
    setChambreSelectionnee(chambre)
    const sejour = sejours.find((s) => s.chambreId === chambre.id && s.statut === 'en_cours')
    setSejourActif(sejour || null)
    if (chambre.statut === 'libre') setShowCheckin(true)
    else if (chambre.statut === 'occupee') setShowCheckout(true)
    else setShowStatutRapide(true)
  }

  async function handleCheckin() {
    if (!formCheckin.clientNom || !formCheckin.clientPrenom || !formCheckin.nuits)
      return toast.error('Remplissez tous les champs obligatoires')
    setLoading(true)
    try {
      await api.post('/hebergement/checkin', { chambreId: chambreSelectionnee!.id, ...formCheckin })
      toast.success(`Check-in — Chambre ${chambreSelectionnee!.numero}`)
      setShowCheckin(false)
      setFormCheckin({ clientNom: '', clientPrenom: '', clientPiece: '', nombrePersonnes: '1', nuits: '1' })
      fetchData()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur')
    } finally { setLoading(false) }
  }

  async function handleCheckout() {
    setLoading(true)
    try {
      await api.post(`/hebergement/checkout/${sejourActif!.id}`, { modePaiement })
      toast.success('Check-out effectué — Chambre en nettoyage')
      setShowCheckout(false)
      fetchData()
    } catch { toast.error('Erreur lors du check-out') }
    finally { setLoading(false) }
  }

  async function handleStatutRapide(statut: string) {
    await api.patch(`/hebergement/chambres/${chambreSelectionnee!.id}/statut`, { statut })
    toast.success(`Chambre ${chambreSelectionnee!.numero} → ${STATUT_CONFIG[statut as keyof typeof STATUT_CONFIG].label}`)
    setShowStatutRapide(false)
    fetchData()
  }

  async function handleAddConso() {
    if (!formConso.description || !formConso.montant) return toast.error('Remplissez tous les champs')
    setLoading(true)
    try {
      await api.post(`/hebergement/sejours/${sejourActif!.id}/consommation`, formConso)
      toast.success('Consommation ajoutée')
      setShowConso(false)
      setFormConso({ description: '', montant: '', type: 'restaurant' })
      fetchData()
    } catch { toast.error('Erreur') }
    finally { setLoading(false) }
  }

  function openFormChambre(chambre?: Chambre) {
    if (chambre) {
      setFormChambre({ numero: chambre.numero, etage: String(chambre.etage), type: chambre.type, prix: String(chambre.prix), capacite: String(chambre.capacite) })
      setChambreAEditer(chambre)
    } else {
      setFormChambre(EMPTY_CHAMBRE)
      setChambreAEditer(null)
    }
    setShowFormChambre(true)
  }

  async function handleSaveChambre() {
    if (!formChambre.numero || !formChambre.prix) return toast.error('Numéro et prix obligatoires')
    setLoading(true)
    try {
      if (chambreAEditer) {
        await api.put(`/hebergement/chambres/${chambreAEditer.id}`, formChambre)
        toast.success('Chambre modifiée')
      } else {
        await api.post('/hebergement/chambres', formChambre)
        toast.success('Chambre ajoutée')
      }
      setShowFormChambre(false)
      fetchData()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur')
    } finally { setLoading(false) }
  }

  const chambresFiltrees = chambres.filter((c) => {
    const matchStatut = filtreStatut === 'tous' || c.statut === filtreStatut
    const matchType = filtreType === 'tous' || c.type === filtreType
    return matchStatut && matchType
  })

  const etages = [...new Set(chambresFiltrees.map((c) => c.etage))].sort()

  const stats = {
    total: chambres.length,
    libres: chambres.filter((c) => c.statut === 'libre').length,
    occupees: chambres.filter((c) => c.statut === 'occupee').length,
    nettoyage: chambres.filter((c) => c.statut === 'nettoyage').length,
    reservees: chambres.filter((c) => c.statut === 'reservee').length,
  }

  return (
    <div className="heberg-page">
      <div className="heberg-header">
        <div>
          <h2>Hébergement</h2>
          <p>{stats.total} chambres · {stats.libres} libres · {stats.occupees} occupées · {stats.nettoyage} nettoyage · {stats.reservees} réservées</p>
        </div>
        {isAdmin && (
          <button className="btn-add-chambre" onClick={() => openFormChambre()}>
            <Plus size={16} /> Nouvelle chambre
          </button>
        )}
      </div>

      {/* STATS CLIQUABLES */}
      <div className="heberg-stats">
        {[
          { label: 'Total', value: stats.total, color: '#2563eb', statut: 'tous' },
          { label: 'Libres', value: stats.libres, color: '#22c55e', statut: 'libre' },
          { label: 'Occupées', value: stats.occupees, color: '#ef4444', statut: 'occupee' },
          { label: 'Nettoyage', value: stats.nettoyage, color: '#f59e0b', statut: 'nettoyage' },
          { label: 'Réservées', value: stats.reservees, color: '#3b82f6', statut: 'reservee' },
        ].map((s) => (
          <div
            key={s.label}
            className={`stat-card stat-clickable ${filtreStatut === s.statut ? 'stat-active' : ''}`}
            style={{ borderLeftColor: s.color }}
            onClick={() => setFiltreStatut(filtreStatut === s.statut ? 'tous' : s.statut)}
          >
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* FILTRES TYPE */}
      <div className="heberg-filtres">
        {['tous', 'simple', 'double', 'suite'].map((t) => (
          <button key={t} className={`filtre-btn ${filtreType === t ? 'active' : ''}`} onClick={() => setFiltreType(t)}>
            {t === 'tous' ? 'Tous types' : TYPE_LABELS[t as keyof typeof TYPE_LABELS]}
          </button>
        ))}
        <span className="legende-hint">💡 Cliquez sur une chambre pour agir dessus</span>
      </div>

      {/* PLAN PAR ETAGE */}
      {etages.length === 0 ? (
        <div className="heberg-empty">Aucune chambre pour ce filtre</div>
      ) : etages.map((etage) => (
        <div key={etage} className="etage-section">
          <h3 className="etage-titre">Étage {etage}</h3>
          <div className="chambres-grid">
            {chambresFiltrees.filter((c) => c.etage === etage).map((chambre) => {
              const config = STATUT_CONFIG[chambre.statut]
              const sejour = sejours.find((s) => s.chambreId === chambre.id && s.statut === 'en_cours')
              return (
                <button
                  key={chambre.id}
                  className="chambre-tile"
                  style={{ borderColor: config.color, background: config.bg }}
                  onClick={() => handleClickChambre(chambre)}
                >
                  {isAdmin && (
                    <button className="btn-edit-chambre" onClick={(e) => { e.stopPropagation(); openFormChambre(chambre) }} title="Modifier">
                      <Pencil size={11} />
                    </button>
                  )}
                  <div className="chambre-numero" style={{ color: config.color }}>{chambre.numero}</div>
                  <div className="chambre-type">{TYPE_LABELS[chambre.type]} · {chambre.capacite} pers.</div>
                  {sejour && <div className="chambre-client">{sejour.clientPrenom} {sejour.clientNom}</div>}
                  <div className="chambre-prix">{chambre.prix.toLocaleString()} FC/nuit</div>
                  <div className="chambre-statut" style={{ color: config.color }}>{config.label}</div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* MODAL STATUT RAPIDE */}
      {showStatutRapide && chambreSelectionnee && (
        <div className="modal-overlay" onClick={() => setShowStatutRapide(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Chambre {chambreSelectionnee.numero}</h3>
                <p className="modal-subtitle">Modification rapide du statut</p>
              </div>
              <button className="modal-close" onClick={() => setShowStatutRapide(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="statuts-grid">
                {STATUTS_RAPIDES.map((s) => {
                  const cfg = STATUT_CONFIG[s]
                  const isCurrent = chambreSelectionnee.statut === s
                  return (
                    <button
                      key={s}
                      className={`statut-btn ${isCurrent ? 'statut-current' : ''}`}
                      style={{ borderColor: cfg.color, background: isCurrent ? cfg.bg : '#fff', color: cfg.color }}
                      onClick={() => handleStatutRapide(s)}
                    >
                      <span className="statut-dot" style={{ background: cfg.color }} />
                      {cfg.label}
                      {isCurrent && <span className="badge-current">actuel</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHECK-IN */}
      {showCheckin && chambreSelectionnee && (
        <div className="modal-overlay" onClick={() => setShowCheckin(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Check-in — Chambre {chambreSelectionnee.numero}</h3>
                <p className="modal-subtitle">{TYPE_LABELS[chambreSelectionnee.type]} · {chambreSelectionnee.prix.toLocaleString()} FC/nuit</p>
              </div>
              <button className="modal-close" onClick={() => setShowCheckin(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Prénom *</label>
                  <input type="text" value={formCheckin.clientPrenom} onChange={(e) => setFormCheckin({ ...formCheckin, clientPrenom: e.target.value })} placeholder="Jean" autoComplete="off" />
                </div>
                <div className="form-group"><label>Nom *</label>
                  <input type="text" value={formCheckin.clientNom} onChange={(e) => setFormCheckin({ ...formCheckin, clientNom: e.target.value })} placeholder="Dupont" autoComplete="off" />
                </div>
              </div>
              <div className="form-group"><label>N° Pièce d'identité</label>
                <input type="text" value={formCheckin.clientPiece} onChange={(e) => setFormCheckin({ ...formCheckin, clientPiece: e.target.value })} placeholder="CNI / Passeport" autoComplete="off" />
              </div>
              <div className="form-row">
                <div className="form-group"><label>Personnes</label>
                  <input type="number" min="1" max={chambreSelectionnee.capacite} value={formCheckin.nombrePersonnes} onChange={(e) => setFormCheckin({ ...formCheckin, nombrePersonnes: e.target.value })} />
                </div>
                <div className="form-group"><label>Nuits *</label>
                  <input type="number" min="1" value={formCheckin.nuits} onChange={(e) => setFormCheckin({ ...formCheckin, nuits: e.target.value })} />
                </div>
              </div>
              <div className="total-preview">
                <span>Total estimé :</span>
                <strong>{(chambreSelectionnee.prix * Number(formCheckin.nuits || 0)).toLocaleString()} FC</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCheckin(false)}>Annuler</button>
              <button className="btn-checkin" onClick={handleCheckin} disabled={loading}>
                <LogIn size={16} /> {loading ? 'Enregistrement...' : 'Confirmer Check-in'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHECK-OUT */}
      {showCheckout && sejourActif && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Check-out — Chambre {chambreSelectionnee?.numero}</h3>
                <p className="modal-subtitle">{sejourActif.clientPrenom} {sejourActif.clientNom}</p>
              </div>
              <button className="modal-close" onClick={() => setShowCheckout(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="facture-preview">
                <div className="facture-ligne">
                  <span>Hébergement ({sejourActif.nuits} nuit{sejourActif.nuits > 1 ? 's' : ''} × {sejourActif.prixNuit.toLocaleString()} FC)</span>
                  <strong>{sejourActif.totalHebergement.toLocaleString()} FC</strong>
                </div>
                {sejourActif.consommations.length > 0 && (<>
                  <div className="facture-section">Consommations</div>
                  {sejourActif.consommations.map((c) => (
                    <div key={c.id} className="facture-ligne facture-conso">
                      <span>{c.description}</span><span>{c.montant.toLocaleString()} FC</span>
                    </div>
                  ))}
                  <div className="facture-ligne">
                    <span>Total consommations</span>
                    <strong>{sejourActif.totalConsommations.toLocaleString()} FC</strong>
                  </div>
                </>)}
                <div className="facture-total">
                  <span>TOTAL À PAYER</span>
                  <strong>{(sejourActif.totalHebergement + sejourActif.totalConsommations).toLocaleString()} FC</strong>
                </div>
              </div>
              <button className="btn-add-conso" onClick={() => setShowConso(true)}>
                <Plus size={15} /> Ajouter une consommation
              </button>
              <div className="form-group">
                <label>Mode de paiement</label>
                <select value={modePaiement} onChange={(e) => setModePaiement(e.target.value)}>
                  <option value="especes">💵 Espèces</option>
                  <option value="carte">💳 Carte bancaire</option>
                  <option value="mobile">📱 Mobile Money</option>
                  <option value="virement">🏦 Virement</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCheckout(false)}>Annuler</button>
              <button className="btn-checkout" onClick={handleCheckout} disabled={loading}>
                <LogOut size={16} /> {loading ? 'Traitement...' : 'Confirmer Check-out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONSOMMATION */}
      {showConso && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowConso(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ajouter une consommation</h3>
              <button className="modal-close" onClick={() => setShowConso(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Type</label>
                <select value={formConso.type} onChange={(e) => setFormConso({ ...formConso, type: e.target.value })}>
                  <option value="restaurant">🍽️ Restaurant</option>
                  <option value="bar">🍺 Bar</option>
                  <option value="autre">📦 Autre</option>
                </select>
              </div>
              <div className="form-group"><label>Description *</label>
                <input type="text" value={formConso.description} onChange={(e) => setFormConso({ ...formConso, description: e.target.value })} placeholder="ex: Dîner du 26/04" autoComplete="off" />
              </div>
              <div className="form-group"><label>Montant (FC) *</label>
                <input type="number" value={formConso.montant} onChange={(e) => setFormConso({ ...formConso, montant: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowConso(false)}>Annuler</button>
              <button className="btn-save" onClick={handleAddConso} disabled={loading}><Check size={16} /> Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM CHAMBRE */}
      {showFormChambre && (
        <div className="modal-overlay" onClick={() => setShowFormChambre(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{chambreAEditer ? 'Modifier la chambre' : 'Nouvelle chambre'}</h3>
                {chambreAEditer && <p className="modal-subtitle">Chambre {chambreAEditer.numero}</p>}
              </div>
              <button className="modal-close" onClick={() => setShowFormChambre(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Numéro *</label>
                  <input type="text" value={formChambre.numero} onChange={(e) => setFormChambre({ ...formChambre, numero: e.target.value })} placeholder="ex: 301" autoComplete="off" />
                </div>
                <div className="form-group"><label>Étage *</label>
                  <input type="number" min="0" value={formChambre.etage} onChange={(e) => setFormChambre({ ...formChambre, etage: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Type *</label>
                  <select value={formChambre.type} onChange={(e) => setFormChambre({ ...formChambre, type: e.target.value as typeof TYPES[number] })}>
                    {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Capacité</label>
                  <input type="number" min="1" value={formChambre.capacite} onChange={(e) => setFormChambre({ ...formChambre, capacite: e.target.value })} />
                </div>
              </div>
              <div className="form-group"><label>Prix / nuit (FC) *</label>
                <input type="number" value={formChambre.prix} onChange={(e) => setFormChambre({ ...formChambre, prix: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowFormChambre(false)}>Annuler</button>
              <button className="btn-save" onClick={handleSaveChambre} disabled={loading}>
                <Check size={16} /> {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
