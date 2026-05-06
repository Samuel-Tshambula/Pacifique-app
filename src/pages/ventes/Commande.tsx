import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVentesStore } from '../../store/ventesStore'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Minus, Plus, Trash2, Search, UtensilsCrossed,
  Beef, Pizza, Coffee, ChefHat, ShoppingBag,
  User, Clock, CheckCircle2, X,
} from 'lucide-react'
import { sounds } from '../../services/sounds'
import './Commande.css'

// ─── Catégories avec icônes Lucide ────────────────────────────────────────────
const CATEGORIES = [
  { label: 'Tous',      icon: UtensilsCrossed },
  { label: 'Burgers',   icon: Beef },
  { label: 'Pizzas',    icon: Pizza },
  { label: 'Plats',     icon: ChefHat },
  { label: 'Boissons',  icon: Coffee },
]

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
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const validating = useRef(false)

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
      sounds.success()
      toast.success('Commande envoyée en cuisine !')
      navigate('/ventes')
    } catch (err: unknown) {
      validating.current = false
      sounds.error()
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
    sounds.click()
    ajouterAuPanier(produit)
    setLastAdded(produit.id)
    setTimeout(() => setLastAdded(null), 400)
  }

  const produitsFiltres = produits.filter((p) => {
    const matchCat = categorie === 'Tous' || p.categorie === categorie
    const matchSearch = !search || p.nom.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch && p.actif !== false
  })

  const total = panier.reduce((sum, l) => sum + l.prix * l.quantite, 0)
  const nbArticles = panier.reduce((sum, l) => sum + l.quantite, 0)

  function getQtePanier(produitId: string) {
    return panier.find((l) => l.produitId === produitId)?.quantite ?? 0
  }

  return (
    <div className="commande-screen">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="header-right">
          <span className="header-serveur"><User size={13} /> {user?.name}</span>
          <span className="header-heure"><Clock size={13} /> {heure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="commande-body">
        {/* ── Catégories ────────────────────────────────────────────────────── */}
        <div className="categories-panel">
          {CATEGORIES.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`cat-btn ${categorie === label ? 'active' : ''}`}
              onClick={() => { setCategorie(label); setSearch('') }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ── Produits ──────────────────────────────────────────────────────── */}
        <div className="produits-panel">
          {produitsFiltres.length === 0 ? (
            <div className="produits-vide">
              <Search size={32} strokeWidth={1.5} />
              <span>Aucun produit trouvé</span>
            </div>
          ) : (
            <div className="produits-grid">
              {produitsFiltres.map((produit) => {
                const rupture = produit.stock === 0
                const qte = getQtePanier(produit.id)
                const maxAtteint = qte >= produit.stock && !rupture
                const faible = produit.stock > 0 && produit.stock <= produit.stockMin
                const isJustAdded = lastAdded === produit.id
                return (
                  <motion.button
                    key={produit.id}
                    className={`produit-btn ${rupture ? 'rupture' : ''} ${qte > 0 ? 'selected' : ''} ${maxAtteint ? 'max-atteint' : ''}`}
                    onClick={() => !rupture && handleAjouter(produit)}
                    disabled={rupture}
                    animate={isJustAdded ? { scale: [1, 1.06, 1] } : {}}
                    transition={{ duration: 0.25 }}
                    whileTap={!rupture ? { scale: 0.96 } : {}}
                  >
                    {qte > 0 && (
                      <motion.span
                        className="badge-qte"
                        key={qte}
                        initial={{ scale: 0.7 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        {qte}
                      </motion.span>
                    )}
                    <span className="produit-nom">{produit.nom}</span>
                    <span className="produit-prix">{produit.prix.toLocaleString()} FC</span>
                    {rupture && (
                      <span className="badge-rupture">
                        <X size={10} /> Rupture
                      </span>
                    )}
                    {faible && !rupture && (
                      <span className="badge-faible">{produit.stock} restants</span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Panier ────────────────────────────────────────────────────────── */}
        <div className="panier-panel">
          <div className="panier-titre">
            <ShoppingBag size={16} />
            Commande
            {nbArticles > 0 && (
              <motion.span
                className="panier-nb-badge"
                key={nbArticles}
                initial={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                {nbArticles}
              </motion.span>
            )}
          </div>

          <div className="panier-liste">
            <AnimatePresence>
              {panier.length === 0 ? (
                <div className="panier-vide">
                  <ShoppingBag size={28} strokeWidth={1.5} />
                  <span>Aucun produit ajouté</span>
                </div>
              ) : (
                panier.map((ligne) => {
                  const produit = produits.find((p) => p.id === ligne.produitId)
                  return (
                    <motion.div
                      key={ligne.produitId}
                      className="panier-ligne"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="ligne-nom">{ligne.produitNom}</div>
                      <div className="ligne-controls">
                        <button className="qty-btn" onClick={() => modifierQuantite(ligne.produitId, ligne.quantite - 1)}>
                          <Minus size={13} />
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
                          <Plus size={13} />
                        </button>
                      </div>
                      <div className="ligne-sous-total">{(ligne.prix * ligne.quantite).toLocaleString()} FC</div>
                      <button className="btn-supprimer" onClick={() => retirerDuPanier(ligne.produitId)}>
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>

          <textarea
            className="notes-input"
            placeholder="Notes spéciales (allergies, cuisson...)"
            value={noteCommande}
            onChange={(e) => setNoteCommande(e.target.value)}
            rows={2}
          />

          <div className="panier-total">
            TOTAL <span>{total.toLocaleString()} FC</span>
          </div>

          <div className="panier-actions">
            <button className="btn-annuler" onClick={handleAnnuler}>
              <X size={15} /> Annuler
            </button>
            <button className="btn-valider" onClick={handleValider} disabled={loading || panier.length === 0}>
              {loading
                ? <><span className="btn-spinner" /> Envoi...</>
                : <><CheckCircle2 size={16} /> Valider (F8)</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
