import { useEffect } from 'react'
import { useVentesStore } from '../../store/ventesStore'
import toast from 'react-hot-toast'
import './Cuisine.css'

const STATUT_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  en_preparation: 'En préparation',
  pret: 'Prêt',
  servi: 'Servi',
}

const STATUT_COLOR: Record<string, string> = {
  en_attente: '#f59e0b',
  en_preparation: '#3b82f6',
  pret: '#22c55e',
  servi: '#9ca3af',
}

export default function Cuisine() {
  const { commandes, fetchCommandes, updateStatutLigne } = useVentesStore()

  useEffect(() => {
    fetchCommandes()
    const interval = setInterval(fetchCommandes, 5000)
    return () => clearInterval(interval)
  }, [])

  const commandesActives = commandes.filter((c) =>
    c.statut === 'en_cours' && c.lignes.some((l) => l.statut !== 'servi')
  )

  async function handleUpdateStatut(commandeId: string, ligneId: string, statut: string) {
    await updateStatutLigne(commandeId, ligneId, statut)
    if (statut === 'pret') toast.success('Plat marqué comme prêt !')
  }

  return (
    <div className="cuisine-screen">
      <div className="cuisine-header">
        <h2>Écran Cuisine</h2>
        <span className="cuisine-count">{commandesActives.length} commande(s) active(s)</span>
      </div>

      {commandesActives.length === 0 ? (
        <div className="cuisine-vide">✅ Aucune commande en attente</div>
      ) : (
        <div className="cuisine-grid">
          {commandesActives.map((commande) => (
            <div key={commande.id} className="commande-card">
              <div className="card-header">
                <span className="card-table">Table {commande.tableNumero}</span>
                <span className="card-numero">{commande.numero}</span>
                <span className="card-heure">
                  {new Date(commande.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {commande.notes && (
                <div className="card-notes">📝 {commande.notes}</div>
              )}

              <div className="card-lignes">
                {commande.lignes.filter((l) => l.statut !== 'servi').map((ligne) => (
                  <div key={ligne.id} className="ligne-cuisine">
                    <div className="ligne-info">
                      <span className="ligne-qte">x{ligne.quantite}</span>
                      <span className="ligne-nom">{ligne.produitNom}</span>
                      {ligne.notes && <span className="ligne-note">({ligne.notes})</span>}
                    </div>
                    <div className="ligne-statut" style={{ color: STATUT_COLOR[ligne.statut] }}>
                      {STATUT_LABEL[ligne.statut]}
                    </div>
                    <div className="ligne-actions">
                      {ligne.statut === 'en_attente' && (
                        <button
                          className="btn-prendre"
                          onClick={() => handleUpdateStatut(commande.id, ligne.id, 'en_preparation')}
                        >
                          Prendre en charge
                        </button>
                      )}
                      {ligne.statut === 'en_preparation' && (
                        <button
                          className="btn-pret"
                          onClick={() => handleUpdateStatut(commande.id, ligne.id, 'pret')}
                        >
                          ✅ Prêt
                        </button>
                      )}
                      {ligne.statut === 'pret' && (
                        <button
                          className="btn-servi"
                          onClick={() => handleUpdateStatut(commande.id, ligne.id, 'servi')}
                        >
                          Servi
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
