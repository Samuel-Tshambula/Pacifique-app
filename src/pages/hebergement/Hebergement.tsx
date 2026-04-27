import { useEffect, useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { X, Check, LogIn, LogOut, Plus } from 'lucide-react'
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

interface Consommation {
  id: string
  description: string
  montant: number
  type: string
  date: string
}

interface Sejour {
  id: string
  chambreId: string
  chambreNumero: string
  clientNom: string
  clientPrenom: string
  nuits: number
  prixNuit: number
  consommations: Consommation[]
  statut: string
  totalHebergement: number
  totalConsommations: number
  dateArrivee: string
}

const STATUT_CONFIG = {
  libre:     { label: 'Libre',      color: '#22c55e', bg: '#f0fdf4' },
  occupee:   { label: 'Occupée',    color: '#ef4444', bg: '#fff5f5' },
  nettoyage: { label: 'Nettoyage',  color: '#f59e0b', bg: '#fffbeb' },
  reservee:  { label: 'Réservée',   color: '#3b82f6', bg: '#eff6ff' },
}

const TYPE_LABELS = { simple: 'Simple', double: 'Double', suite: 'Suite' }

export default function Hebergement() {
  const [chambres, setChambres] = useState<Chambre[]>([])
  const [sejours, setSejours] = useState<Sejour[]>([])
  const [chambreSelectionnee, setChambreSelectionnee] = useState<Chambre | null>(null)
  const [sejourActif, setSejourActif] = useState<Sejour | null>(null)
  const [showCheckin, setShowCheckin] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showConso, setShowConso] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formCheckin, setFormCheckin] = useState({ clientNom: '', clientPrenom: '', clientPiece: '', nombrePersonnes: '1', nuits: '1' })
  const [formConso, setFormConso] = useState({ description: '', montant: '', type: 'restaurant' })
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
    else if (chambre.statut === 'nettoyage') handleMarquerNettoyee(chambre)
  }

  async function handleCheckin() {
    if (!formCheckin.clientNom || !formCheckin.clientPrenom || !formCheckin.nuits)
      return toast.error('Remplissez tous les champs obligatoires')
    setLoading(true)
    try {
      await api.post('/hebergement/checkin', { chambreId: chambreSelectionnee!.id, ...formCheckin })
      toast.success(`Check-in effectué — Chambre ${chambreSelectionnee!.numero}`)
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

  async function handleMarquerNettoyee(chambre: Chambre) {
    await api.patch(`/hebergement/chambres/${chambre.id}/statut`, { statut: 'libre' })
    toast.success(`Chambre ${chambre.numero} marquée comme nettoyée`)
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

  const etages = [...new Set(chambres.map((c) => c.etage))].sort()
  const stats = {
    total: chambres.length,
    libres: chambres.filter((c) => c.statut === 'libre').length,
    occupees: chambres.filter((c) => c.statut === 'occupee').length,
    nettoyage: chambres.filter((c) => c.statut === 'nettoyage').length,
  }

  return (
    <div className="heberg-page">
      <div className="heberg-header">
        <div>
          <h2>Hébergement</h2>
          <p>{stats.total} chambres · {stats.libres} libres · {stats.occupees} occupées · {stats.nettoyage} en nettoyage</p>
        </div>
      </div>

      {/* STATS */}
      <div className="heberg-stats">
        {[
          { label: 'Total chambres', value: stats.total, color: '#2563eb' },
          { label: 'Libres', value: stats.libres, color: '#22c55e' },
          { label: 'Occupées', value: stats.occupees, color: '#ef4444' },
          { label: 'Nettoyage', value: stats.nettoyage, color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ borderLeftColor: s.color }}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* LEGENDE */}
      <div className="legende">
        {Object.entries(STATUT_CONFIG).map(([key, val]) => (
          <div key={key} className="legende-item">
            <span className="legende-dot" style={{ background: val.color }} />
            <span>{val.label}</span>
          </div>
        ))}
        <span className="legende-hint">💡 Cliquez sur une chambre en nettoyage pour la marquer comme nettoyée</span>
      </div>

      {/* PLAN PAR ETAGE */}
      {etages.map((etage) => (
        <div key={etage} className="etage-section">
          <h3 className="etage-titre">Étage {etage}</h3>
          <div className="chambres-grid">
            {chambres.filter((c) => c.etage === etage).map((chambre) => {
              const config = STATUT_CONFIG[chambre.statut]
              const sejour = sejours.find((s) => s.chambreId === chambre.id && s.statut === 'en_cours')
              return (
                <button
                  key={chambre.id}
                  className="chambre-tile"
                  style={{ borderColor: config.color, background: config.bg }}
                  onClick={() => handleClickChambre(chambre)}
                >
                  <div className="chambre-numero" style={{ color: config.color }}>
                    {chambre.numero}
                  </div>
                  <div className="chambre-type">{TYPE_LABELS[chambre.type]}</div>
                  {sejour && (
                    <div className="chambre-client">{sejour.clientPrenom} {sejour.clientNom}</div>
                  )}
                  <div className="chambre-prix">{chambre.prix.toLocaleString()} FC/nuit</div>
                  <div className="chambre-statut" style={{ color: config.color }}>{config.label}</div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

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
                <div className="form-group">
                  <label>Prénom *</label>
                  <input type="text" value={formCheckin.clientPrenom} onChange={(e) => setFormCheckin({ ...formCheckin, clientPrenom: e.target.value })} placeholder="Jean" autoComplete="off" />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" value={formCheckin.clientNom} onChange={(e) => setFormCheckin({ ...formCheckin, clientNom: e.target.value })} placeholder="Dupont" autoComplete="off" />
                </div>
              </div>
              <div className="form-group">
                <label>N° Pièce d'identité</label>
                <input type="text" value={formCheckin.clientPiece} onChange={(e) => setFormCheckin({ ...formCheckin, clientPiece: e.target.value })} placeholder="Numéro CNI / Passeport" autoComplete="off" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre de personnes</label>
                  <input type="number" min="1" max={chambreSelectionnee.capacite} value={formCheckin.nombrePersonnes} onChange={(e) => setFormCheckin({ ...formCheckin, nombrePersonnes: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Nombre de nuits *</label>
                  <input type="number" min="1" value={formCheckin.nuits} onChange={(e) => setFormCheckin({ ...formCheckin, nuits: e.target.value })} />
                </div>
              </div>
              <div className="total-preview">
                <span>Total hébergement estimé :</span>
                <strong>{(chambreSelectionnee.prix * Number(formCheckin.nuits || 0)).toLocaleString()} FC</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCheckin(false)}>Annuler</button>
              <button className="btn-checkin" onClick={handleCheckin} disabled={loading}>
                <LogIn size={16} /> {loading ? 'Enregistrement...' : 'Confirmer le Check-in'}
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
                {sejourActif.consommations.length > 0 && (
                  <>
                    <div className="facture-section">Consommations</div>
                    {sejourActif.consommations.map((c) => (
                      <div key={c.id} className="facture-ligne facture-conso">
                        <span>{c.description}</span>
                        <span>{c.montant.toLocaleString()} FC</span>
                      </div>
                    ))}
                    <div className="facture-ligne">
                      <span>Total consommations</span>
                      <strong>{sejourActif.totalConsommations.toLocaleString()} FC</strong>
                    </div>
                  </>
                )}
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
                <LogOut size={16} /> {loading ? 'Traitement...' : 'Confirmer le Check-out'}
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
              <div className="form-group">
                <label>Type</label>
                <select value={formConso.type} onChange={(e) => setFormConso({ ...formConso, type: e.target.value })}>
                  <option value="restaurant">🍽️ Restaurant</option>
                  <option value="bar">🍺 Bar</option>
                  <option value="autre">📦 Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input type="text" value={formConso.description} onChange={(e) => setFormConso({ ...formConso, description: e.target.value })} placeholder="ex: Dîner du 26/04" autoComplete="off" />
              </div>
              <div className="form-group">
                <label>Montant (FC) *</label>
                <input type="number" value={formConso.montant} onChange={(e) => setFormConso({ ...formConso, montant: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowConso(false)}>Annuler</button>
              <button className="btn-save" onClick={handleAddConso} disabled={loading}>
                <Check size={16} /> Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
