import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVentesStore } from '../../store/ventesStore'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { Minus, Plus, Trash2, Search } from 'lucide-react'
import './Commande.css'

const CATEGORIES = ['Tous', 'Burgers', 'Pizzas', 'Plats', 'Boissons']

export default function Commande() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    tableSelectionnee, produits, panier, noteCommande,
    fetchProduits, ajouterAuPanier, retirerDuPanier,
    modifierQuantite, setNoteCommande, validerCommande,
  } = useVentesStore()

  const [categorie, setCategorie] = useState('Tous')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [heure, setHeure] = useState(new Date())
  const validating = useRef(false) // empêche la redirection parasite du useEffect

  useEffect(() => {
    if (!tableSelectionnee && !validating.current) {
      navigate('/ventes')
      return
    }
    fetchProduits()
    const timer = setInterval(() => setHeure(new Date()), 30000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleValider = useCallback(async () => {
    const { panier: p } = useVentesStore.getState()
    if (p.length === 0) { toast.error('Ajoutez au moins un produit'); return }
    validating.current = true
    setLoading(true)
    try {
      await validerCommande(user!.id, user!.name)
      toast.success('Commande envoyée en cuisine !')
      navigate('/ventes')
    } catch (err: unknown) {
      validating.current = false
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Erreur lors de la validation')
    } finally { setLoading(false) }
  }, [user, validerCommande, navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'F8') { e.preventDefault(); handleValider() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleValider])

  function handleAnnuler() {
    useVentesStore.setState({ panier: [], noteCommande: '', tableSelectionnee: null })
    navigate('/ventes')
  }

  function handleAjouter(produit: typeof produits[0]) {
    const qteActuelle = panier.find((l) => l.produitId === produit.id)?.quantite ?? 0
    if (qteActuelle >= produit.stock) {
      toast.error(`Stock maximum atteint (${produit.stock} ${produit.unite})`)
      return
    }
    ajouterAuPanier(produit)
  }

  const produitsFiltres = produits.filter((p) => {
    const matchCat = categorie === 'Tous' || p.categorie === categorie
    const matchSearch = !search || p.nom.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const total = panier.reduce((sum, l) => sum + l.prix * l.quantite, 0)
  const nbArticles = panier.reduce((sum, l) => sum + l.quantite, 0)

  function getQtePanier(produitId: string) {
    return panier.find((l) => l.produitId === produitId)?.quantite ?? 0
  }

  return (
    <div className="commande-screen">
      <div className="commande-header">
        <div className="header-info">
          <span className="header-table">Table {tableSelectionnee?.numero}</span>
          <span className="header-zone">{tableSelectionnee?.zone}</span>
        </div>
        <div className="header-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="header-right">
          <span className="header-serveur">👤 {user?.name}</span>
          <span className="header-heure">{heure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="commande-body">
        {/* CATEGORIES */}
        <div className="categories-panel">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`cat-btn ${categorie === cat ? 'active' : ''}`}
              onClick={() => { setCategorie(cat); setSearch('') }}
            >
              <span className="cat-icon">
                {cat === 'Tous' ? '🍽️' : cat === 'Burgers' ? '🍔' : cat === 'Pizzas' ? '🍕' : cat === 'Boissons' ? '🥤' : '🍗'}
              </span>
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* PRODUITS */}
        <div className="produits-panel">
          {produitsFiltres.length === 0 ? (
            <div className="produits-vide">Aucun produit trouvé</div>
          ) : (
            <div className="produits-grid">
              {produitsFiltres.map((produit) => {
                const rupture = produit.stock === 0
                const qte = getQtePanier(produit.id)
                const maxAtteint = qte >= produit.stock && !rupture
                const faible = produit.stock > 0 && produit.stock <= produit.stockMin
                return (
                  <button
                    key={produit.id}
                    className={`produit-btn ${rupture ? 'rupture' : ''} ${qte > 0 ? 'selected' : ''} ${maxAtteint ? 'max-atteint' : ''}`}
                    onClick={() => !rupture && handleAjouter(produit)}
                    disabled={rupture}
                  >
                    {qte > 0 && <span className="badge-qte">{qte}</span>}
                    <span className="produit-nom">{produit.nom}</span>
                    <span className="produit-prix">{produit.prix.toLocaleString()} FC</span>
                    {rupture && <span className="badge-rupture">Rupture</span>}
                    {faible && !rupture && <span className="badge-faible">⚠️ {produit.stock} restants</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* PANIER */}
        <div className="panier-panel">
          <div className="panier-titre">
            Commande
            {nbArticles > 0 && <span className="panier-nb-badge">{nbArticles}</span>}
          </div>

          <div className="panier-liste">
            {panier.length === 0 ? (
              <div className="panier-vide">Aucun produit ajouté</div>
            ) : (
              panier.map((ligne) => {
                const produit = produits.find((p) => p.id === ligne.produitId)
                return (
                  <div key={ligne.produitId} className="panier-ligne">
                    <div className="ligne-nom">{ligne.produitNom}</div>
                    <div className="ligne-controls">
                      <button className="qty-btn" onClick={() => modifierQuantite(ligne.produitId, ligne.quantite - 1)}>
                        <Minus size={14} />
                      </button>
                      <span className="qty-value">{ligne.quantite}</span>
                      <button
                        className="qty-btn"
                        onClick={() => {
                          if (produit && ligne.quantite >= produit.stock) {
                            toast.error(`Stock max : ${produit.stock}`)
                            return
                          }
                          modifierQuantite(ligne.produitId, ligne.quantite + 1)
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="ligne-sous-total">{(ligne.prix * ligne.quantite).toLocaleString()} FC</div>
                    <button className="btn-supprimer" onClick={() => retirerDuPanier(ligne.produitId)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <textarea
            className="notes-input"
            placeholder="Notes spéciales..."
            value={noteCommande}
            onChange={(e) => setNoteCommande(e.target.value)}
            rows={2}
          />

          <div className="panier-total">
            TOTAL : <span>{total.toLocaleString()} FC</span>
          </div>

          <div className="panier-actions">
            <button className="btn-annuler" onClick={handleAnnuler}>Annuler</button>
            <button className="btn-valider" onClick={handleValider} disabled={loading}>
              {loading ? 'Envoi...' : '✓ Valider (F8)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
