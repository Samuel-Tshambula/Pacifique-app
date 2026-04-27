import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { Plus, History, Search, X, Check, PackagePlus } from 'lucide-react'
import './Stock.css'

const CATEGORIES = ['Tous', 'Burgers', 'Pizzas', 'Plats', 'Boissons']

interface Produit {
  id: string
  code: string
  nom: string
  prix: number
  categorie: string
  stock: number
  stockMin: number
  unite: string
  actif: boolean
}

interface Mouvement {
  id: string
  produitNom: string
  type: string
  quantite: number
  motif: string
  userName: string
  date: string
}

const EMPTY_PRODUIT = { code: '', nom: '', prix: '', categorie: 'Boissons', stock: '', stockMin: '', unite: 'pièce' }

export default function Stock() {
  const { user } = useAuthStore()
  const [produits, setProduits] = useState<Produit[]>([])
  const [search, setSearch] = useState('')
  const [categorie, setCategorie] = useState('Tous')
  const [showAddProduit, setShowAddProduit] = useState(false)
  const [showMouvement, setShowMouvement] = useState<Produit | null>(null)
  const [showHistorique, setShowHistorique] = useState<Produit | null>(null)
  const [mouvements, setMouvements] = useState<Mouvement[]>([])
  const [formProduit, setFormProduit] = useState(EMPTY_PRODUIT)
  const [formMouvement, setFormMouvement] = useState({ type: 'entree', quantite: '', motif: '' })
  const [loading, setLoading] = useState(false)

  async function fetchProduits() {
    const { data } = await api.get('/stock')
    setProduits(data)
  }

  useEffect(() => { fetchProduits() }, [])

  const produitsFiltres = produits.filter((p) => {
    const matchSearch = p.nom.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
    const matchCat = categorie === 'Tous' || p.categorie === categorie
    return matchSearch && matchCat
  })

  function getStatut(p: Produit) {
    if (p.stock === 0) return 'rupture'
    if (p.stock <= p.stockMin) return 'faible'
    return 'normal'
  }

  async function handleAddProduit() {
    if (!formProduit.code || !formProduit.nom || !formProduit.prix)
      return toast.error('Remplissez tous les champs obligatoires')
    setLoading(true)
    try {
      await api.post('/stock', formProduit)
      toast.success('Produit ajouté')
      setShowAddProduit(false)
      setFormProduit(EMPTY_PRODUIT)
      fetchProduits()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Erreur')
    } finally { setLoading(false) }
  }

  async function handleMouvement() {
    if (!formMouvement.quantite || !formMouvement.motif)
      return toast.error('Quantité et motif obligatoires')
    setLoading(true)
    try {
      await api.post(`/stock/${showMouvement!.id}/mouvement`, { ...formMouvement, userId: user?.id })
      toast.success('Stock mis à jour')
      setShowMouvement(null)
      setFormMouvement({ type: 'entree', quantite: '', motif: '' })
      fetchProduits()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Erreur')
    } finally { setLoading(false) }
  }

  async function openHistorique(p: Produit) {
    setShowHistorique(p)
    const { data } = await api.get(`/stock/${p.id}/mouvements`)
    setMouvements(data)
  }

  const stats = {
    total: produits.length,
    rupture: produits.filter((p) => p.stock === 0).length,
    faible: produits.filter((p) => p.stock > 0 && p.stock <= p.stockMin).length,
  }

  return (
    <div className="stock-page">
      <div className="stock-header">
        <div>
          <h2>Gestion du stock</h2>
          <p>{stats.total} produits · <span className="text-red">{stats.rupture} rupture(s)</span> · <span className="text-orange">{stats.faible} stock(s) faible(s)</span></p>
        </div>
        <button className="btn-add" onClick={() => setShowAddProduit(true)}>
          <Plus size={18} /> Nouveau produit
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="stock-stats">
        {[
          { label: 'Total produits', value: stats.total, color: '#2563eb' },
          { label: 'En rupture', value: stats.rupture, color: '#ef4444' },
          { label: 'Stock faible', value: stats.faible, color: '#f59e0b' },
          { label: 'Disponibles', value: stats.total - stats.rupture - stats.faible, color: '#22c55e' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ borderLeftColor: s.color }}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* FILTRES */}
      <div className="stock-filtres">
        <div className="search-wrapper">
          <Search size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="cat-filtres">
          {CATEGORIES.map((c) => (
            <button key={c} className={`cat-filter-btn ${categorie === c ? 'active' : ''}`} onClick={() => setCategorie(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="stock-table-wrapper">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Prix unitaire</th>
              <th>Stock actuel</th>
              <th>Stock min.</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {produitsFiltres.map((p) => {
              const statut = getStatut(p)
              return (
                <tr key={p.id} className={`stock-row ${statut}`}>
                  <td className="code-cell">{p.code}</td>
                  <td className="nom-cell">{p.nom}</td>
                  <td>{p.categorie}</td>
                  <td>{p.prix.toLocaleString()} FC</td>
                  <td className="stock-cell">
                    <span className={`stock-value ${statut}`}>{p.stock} {p.unite}</span>
                  </td>
                  <td>{p.stockMin} {p.unite}</td>
                  <td>
                    {statut === 'rupture' && <span className="badge-statut rupture">🔴 Rupture</span>}
                    {statut === 'faible' && <span className="badge-statut faible">🟠 Stock faible</span>}
                    {statut === 'normal' && <span className="badge-statut normal">🟢 Normal</span>}
                  </td>
                  <td className="actions-cell">
                    <button className="btn-action btn-approvisioner" onClick={() => { setShowMouvement(p); setFormMouvement({ type: 'entree', quantite: '', motif: '' }) }} title="Approvisionner">
                      <PackagePlus size={15} />
                    </button>
                    <button className="btn-action btn-historique" onClick={() => openHistorique(p)} title="Historique">
                      <History size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {produitsFiltres.length === 0 && (
          <div className="stock-empty">Aucun produit trouvé</div>
        )}
      </div>

      {/* MODAL NOUVEAU PRODUIT */}
      {showAddProduit && (
        <div className="modal-overlay" onClick={() => setShowAddProduit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nouveau produit</h3>
              <button className="modal-close" onClick={() => setShowAddProduit(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Code *</label>
                  <input type="text" value={formProduit.code} onChange={(e) => setFormProduit({ ...formProduit, code: e.target.value })} placeholder="ex: BOI05" autoComplete="off" />
                </div>
                <div className="form-group">
                  <label>Catégorie *</label>
                  <select value={formProduit.categorie} onChange={(e) => setFormProduit({ ...formProduit, categorie: e.target.value })}>
                    {['Burgers', 'Pizzas', 'Plats', 'Boissons'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Nom du produit *</label>
                <input type="text" value={formProduit.nom} onChange={(e) => setFormProduit({ ...formProduit, nom: e.target.value })} placeholder="ex: Fanta Orange" autoComplete="off" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Prix unitaire (FC) *</label>
                  <input type="number" value={formProduit.prix} onChange={(e) => setFormProduit({ ...formProduit, prix: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Unité</label>
                  <input type="text" value={formProduit.unite} onChange={(e) => setFormProduit({ ...formProduit, unite: e.target.value })} placeholder="pièce, bouteille..." autoComplete="off" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stock initial</label>
                  <input type="number" value={formProduit.stock} onChange={(e) => setFormProduit({ ...formProduit, stock: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Stock minimum</label>
                  <input type="number" value={formProduit.stockMin} onChange={(e) => setFormProduit({ ...formProduit, stockMin: e.target.value })} placeholder="5" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddProduit(false)}>Annuler</button>
              <button className="btn-save" onClick={handleAddProduit} disabled={loading}>
                <Check size={16} /> {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOUVEMENT */}
      {showMouvement && (
        <div className="modal-overlay" onClick={() => setShowMouvement(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mouvement de stock</h3>
              <button className="modal-close" onClick={() => setShowMouvement(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="produit-info-box">
                <span className="produit-info-nom">{showMouvement.nom}</span>
                <span className="produit-info-stock">Stock actuel : <strong>{showMouvement.stock} {showMouvement.unite}</strong></span>
              </div>
              <div className="form-group">
                <label>Type de mouvement</label>
                <select value={formMouvement.type} onChange={(e) => setFormMouvement({ ...formMouvement, type: e.target.value })}>
                  <option value="entree">📦 Entrée (approvisionnement)</option>
                  <option value="sortie">📤 Sortie manuelle</option>
                  <option value="ajustement">🔧 Ajustement (inventaire)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantité *</label>
                <input type="number" value={formMouvement.quantite} onChange={(e) => setFormMouvement({ ...formMouvement, quantite: e.target.value })} placeholder="0" min="1" />
              </div>
              <div className="form-group">
                <label>Motif *</label>
                <input type="text" value={formMouvement.motif} onChange={(e) => setFormMouvement({ ...formMouvement, motif: e.target.value })} placeholder="ex: Livraison fournisseur, casse..." autoComplete="off" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowMouvement(null)}>Annuler</button>
              <button className="btn-save" onClick={handleMouvement} disabled={loading}>
                <Check size={16} /> {loading ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIQUE */}
      {showHistorique && (
        <div className="modal-overlay" onClick={() => setShowHistorique(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Historique — {showHistorique.nom}</h3>
              <button className="modal-close" onClick={() => setShowHistorique(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {mouvements.length === 0 ? (
                <div className="historique-empty">Aucun mouvement enregistré</div>
              ) : (
                <table className="historique-table">
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Quantité</th><th>Motif</th><th>Par</th></tr>
                  </thead>
                  <tbody>
                    {mouvements.map((m) => (
                      <tr key={m.id}>
                        <td>{new Date(m.date).toLocaleString('fr-FR')}</td>
                        <td>
                          <span className={`badge-type ${m.type}`}>
                            {m.type === 'entree' ? '📦 Entrée' : m.type === 'sortie' ? '📤 Sortie' : '🔧 Ajustement'}
                          </span>
                        </td>
                        <td><strong>{m.quantite}</strong></td>
                        <td>{m.motif}</td>
                        <td>{m.userName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
