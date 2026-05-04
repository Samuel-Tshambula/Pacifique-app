import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVentesStore } from '../../store/ventesStore'
import type { Table } from '../../store/ventesStore'
import toast from 'react-hot-toast'
import { X, Bell, CreditCard, Banknote, Smartphone } from 'lucide-react'
import './PlanSalle.css'

const STATUT_CONFIG = {
  libre:     { label: 'Libre',      color: '#22c55e' },
  occupee:   { label: 'Occupée',    color: '#ef4444' },
  reservee:  { label: 'Réservée',   color: '#3b82f6' },
  nettoyage: { label: 'Nettoyage',  color: '#f59e0b' },
}

const ZONES = ['salle', 'terrasse', 'bar'] as const
const MODES_PAIEMENT = [
  { id: 'especes',  label: 'Espèces',   icon: Banknote },
  { id: 'carte',    label: 'Carte',     icon: CreditCard },
  { id: 'mobile',   label: 'Mobile',    icon: Smartphone },
]

export default function PlanSalle() {
  const { tables, commandes, fetchTables, fetchCommandes, selectionnerTable, payerCommande, updateStatutLigne } = useVentesStore()
  const navigate = useNavigate()

  const [tableModal, setTableModal] = useState<Table | null>(null)
  const [modePaiement, setModePaiement] = useState('especes')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    fetchTables()
    fetchCommandes()
    const interval = setInterval(() => { fetchTables(); fetchCommandes() }, 5000)
    return () => clearInterval(interval)
  }, [fetchTables, fetchCommandes])

  // Commandes prêtes (toutes lignes pret ou servi)
  const commandesPrêtes = commandes.filter((c) =>
    c.statut === 'prete' || (c.statut === 'en_cours' && c.lignes.every((l) => l.statut === 'pret' || l.statut === 'servi'))
  )

  function getCommandeTable(tableId: string) {
    return commandes.find((c) => c.tableId === tableId && (c.statut === 'en_cours' || c.statut === 'prete'))
  }

  function handleSelectTable(table: Table) {
    if (table.statut === 'libre') {
      selectionnerTable(table)
      navigate('/ventes/commande')
    } else if (table.statut === 'occupee') {
      setTableModal(table)
      setModePaiement('especes')
    }
  }

  async function handleMarquerServi(commandeId: string, ligneId: string) {
    await updateStatutLigne(commandeId, ligneId, 'servi')
    toast.success('Plat marqué comme servi')
  }

  async function handlePayer() {
    const commande = getCommandeTable(tableModal!.id)
    if (!commande) return
    setPaying(true)
    try {
      await payerCommande(commande.id, modePaiement)
      toast.success(`Table ${tableModal!.numero} — Paiement enregistré ✅`)
      setTableModal(null)
      navigate(`/ticket/${commande.id}`)
    } catch {
      toast.error('Erreur lors du paiement')
    } finally {
      setPaying(false)
    }
  }

  const commandeModal = tableModal ? getCommandeTable(tableModal.id) : null

  return (
    <div className="plan-salle">
      <div className="plan-header">
        <h2>Plan de salle</h2>
        <div className="legende">
          {Object.entries(STATUT_CONFIG).map(([key, val]) => (
            <div key={key} className="legende-item">
              <span className="legende-dot" style={{ background: val.color }} />
              <span>{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BANDEAU PLATS PRÊTS */}
      {commandesPrêtes.length > 0 && (
        <div className="plats-prets-banner">
          <span className="prets-icon"><Bell size={18} /></span>
          <span className="prets-text">
            <strong>{commandesPrêtes.length} commande(s) prête(s) à servir :</strong>{' '}
            {commandesPrêtes.map((c) => `Table ${c.tableNumero}`).join(', ')}
          </span>
        </div>
      )}

      {ZONES.map((zone) => {
        const tablesZone = tables.filter((t) => t.zone === zone)
        if (tablesZone.length === 0) return null
        return (
          <div key={zone} className="zone-section">
            <h3 className="zone-titre">{zone.charAt(0).toUpperCase() + zone.slice(1)}</h3>
            <div className="tables-grid">
              {tablesZone.map((table) => {
                const config = STATUT_CONFIG[table.statut]
                const commande = getCommandeTable(table.id)
                const isPrete = commande && (commande.statut === 'prete' || commande.lignes.every((l) => l.statut === 'pret' || l.statut === 'servi'))
                return (
                  <button
                    key={table.id}
                    className={`table-tile clickable ${isPrete ? 'prete' : ''}`}
                    style={{ borderColor: isPrete ? '#22c55e' : config.color, background: isPrete ? '#f0fdf4' : `${config.color}18` }}
                    onClick={() => handleSelectTable(table)}
                    title={table.statut === 'libre' ? 'Cliquer pour commander' : 'Cliquer pour gérer la table'}
                  >
                    <div className="table-numero" style={{ color: isPrete ? '#16a34a' : config.color }}>
                      Table {table.numero}
                    </div>
                    <div className="table-capacite">{table.capacite} pers.</div>
                    {commande && (
                      <div className="table-total">{commande.total.toLocaleString()} FC</div>
                    )}
                    <div className="table-statut" style={{ color: isPrete ? '#16a34a' : config.color }}>
                      {isPrete ? '✅ Prête' : config.label}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* MODAL TABLE OCCUPÉE */}
      {tableModal && (
        <div className="modal-overlay" onClick={() => setTableModal(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Table {tableModal.numero} — {tableModal.zone}</h3>
                {commandeModal && (
                  <div className="modal-subtitle">{commandeModal.numero} · {commandeModal.serveurNom}</div>
                )}
              </div>
              <button className="modal-close" onClick={() => setTableModal(null)}><X size={20} /></button>
            </div>

            {!commandeModal ? (
              <div className="modal-body">
                <div className="empty-state">Aucune commande active sur cette table</div>
              </div>
            ) : (
              <>
                <div className="modal-body">
                  {/* LIGNES COMMANDE */}
                  <div className="commande-lignes-list">
                    {commandeModal.lignes.map((ligne) => (
                      <div key={ligne.id} className={`commande-ligne-row statut-${ligne.statut}`}>
                        <span className="cl-qte">x{ligne.quantite}</span>
                        <span className="cl-nom">{ligne.produitNom}</span>
                        <span className={`cl-badge statut-badge-${ligne.statut}`}>
                          {ligne.statut === 'en_attente'    && 'En attente'}
                          {ligne.statut === 'en_preparation' && 'En préparation'}
                          {ligne.statut === 'pret'           && 'Prêt'}
                          {ligne.statut === 'servi'          && 'Servi'}
                        </span>
                        <span className="cl-prix">{(ligne.prix * ligne.quantite).toLocaleString()} FC</span>
                        {ligne.statut === 'pret' && (
                          <button className="btn-servi-inline" onClick={() => handleMarquerServi(commandeModal.id, ligne.id)}>
                            Marquer servi
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {commandeModal.notes && (
                    <div className="commande-notes-box">Note : {commandeModal.notes}</div>
                  )}

                  <div className="commande-total-row">
                    <span>Total</span>
                    <strong>{commandeModal.total.toLocaleString()} FC</strong>
                  </div>

                  {/* MODE PAIEMENT */}
                  <div className="paiement-section">
                    <div className="paiement-label">Mode de paiement</div>
                    <div className="paiement-modes">
                      {MODES_PAIEMENT.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          className={`mode-btn ${modePaiement === id ? 'active' : ''}`}
                          onClick={() => setModePaiement(id)}
                        >
                          <Icon size={18} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn-cancel" onClick={() => setTableModal(null)}>Fermer</button>
                  <button className="btn-payer" onClick={handlePayer} disabled={paying}>
                    {paying ? 'Traitement...' : <><CreditCard size={16} /> Encaisser {commandeModal.total.toLocaleString()} FC</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
