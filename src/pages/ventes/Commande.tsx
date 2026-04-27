import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVentesStore } from '../../store/ventesStore'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { Minus, Plus, Trash2 } from 'lucide-react'
import './Commande.css'

const CATEGORIES = ['Tous', 'Burgers', 'Pizzas', 'Plats', 'Boissons']

export default function Commande() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    tableSelectionnee, produits, panier, noteCommande,
    fetchProduits, ajouterAuPanier, retirerDuPanier,
    modifierQuantite, setNoteCommande, viderPanier, validerCommande,
  } = useVentesStore()

  const [categorie, setCategorie] = useState('Tous')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tableSelectionnee) { navigate('/ventes'); return }
    fetchProduits()
  }, [])

  const produitsFiltres = produits.filter((p) => categorie === 'Tous' || p.categorie === categorie)
  const total = panier.reduce((sum, l) => sum + l.prix * l.quantite, 0)

  async function handleValider() {
    if (panier.length === 0) { toast.error('Ajoutez au moins un produit'); return }
    setLoading(true)
    try {
      await validerCommande(user!.id, user!.name)
      toast.success('Commande envoyée en cuisine !')
      navigate('/ventes')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Erreur lors de la validation')
    } finally {
      setLoading(false)
    }
  }

  function handleAnnuler() {
    viderPanier()
    navigate('/ventes')
  }

  return (
    <div className="commande-screen">
      {/* HEADER */}
      <div className="commande-header">
        <div className="header-info">
          <span className="header-table">Table {tableSelectionnee?.numero}</span>
          <span className="header-zone">{tableSelectionnee?.zone}</span>
        </div>
        <div className="header-center">
          <span className="header-serveur">👤 {user?.name}</span>
        </div>
        <div className="header-heure">
          {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="commande-body">
        {/* CATEGORIES */}
        <div className="categories-panel">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`cat-btn ${categorie === cat ? 'active' : ''}`}
              onClick={() => setCategorie(cat)}
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
          <div className="produits-grid">
            {produitsFiltres.map((produit) => {
              const rupture = produit.stock === 0
              const faible = produit.stock > 0 && produit.stock <= produit.stockMin
              return (
                <button
                  key={produit.id}
                  className={`produit-btn ${rupture ? 'rupture' : ''}`}
                  onClick={() => !rupture && ajouterAuPanier(produit)}
                  disabled={rupture}
                >
                  <span className="produit-nom">{produit.nom}</span>
                  <span className="produit-prix">{produit.prix.toLocaleString()} FC</span>
                  {rupture && <span className="badge-rupture">Rupture</span>}
                  {faible && !rupture && <span className="badge-faible">Stock faible</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* PANIER */}
        <div className="panier-panel">
          <h3 className="panier-titre">Commande</h3>

          <div className="panier-liste">
            {panier.length === 0 ? (
              <div className="panier-vide">Aucun produit ajouté</div>
            ) : (
              panier.map((ligne) => (
                <div key={ligne.produitId} className="panier-ligne">
                  <div className="ligne-nom">{ligne.produitNom}</div>
                  <div className="ligne-controls">
                    <button className="qty-btn" onClick={() => modifierQuantite(ligne.produitId, ligne.quantite - 1)}>
                      <Minus size={14} />
                    </button>
                    <span className="qty-value">{ligne.quantite}</span>
                    <button className="qty-btn" onClick={() => modifierQuantite(ligne.produitId, ligne.quantite + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="ligne-sous-total">{(ligne.prix * ligne.quantite).toLocaleString()} FC</div>
                  <button className="btn-supprimer" onClick={() => retirerDuPanier(ligne.produitId)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
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
              {loading ? 'Envoi...' : 'Valider (F8)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
