import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVentesStore } from '../../store/ventesStore'
import type { Table, Commande } from '../../store/ventesStore'
import toast from 'react-hot-toast'
import { X, Check, Printer } from 'lucide-react'
import './PlanSalle.css'

const STATUT_CONFIG = {
  libre:     { label: 'Libre',     color: '#22c55e' },
  occupee:   { label: 'Occupée',   color: '#ef4444' },
  reservee:  { label: 'Réservée',  color: '#3b82f6' },
  nettoyage: { label: 'Nettoyage', color: '#f59e0b' },
}

const MODES_PAIEMENT = ['Cash', 'Mobile Money', 'Carte']
const ZONES = ['salle', 'terrasse', 'bar'] as const

export default function PlanSalle() {
  const { tables, commandes, fetchTables, fetchCommandes, selectionnerTable, selectionnerTableOccupee, annulerCommande, payerCommande } = useVentesStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(false)
  const [liberant, setLiberant] = useState<string | null>(null)
  const [modalPaiement, setModalPaiement] = useState<{ table: Table; commande: Commande } | null>(null)
  const [modePaiement, setModePaiement] = useState('Cash')
  const [payant, setPayant] = useState(false)
  const [ticketCommandeId, setTicketCommandeId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(tables.length === 0)
    Promise.all([fetchTables(), fetchCommandes()])
      .catch(() => { if (tables.length === 0) setErreur(true) })
      .finally(() => setLoading(false))
  }, [])

  function getCommandeTable(table: Table) {
    return commandes.find((c) => c.tableId === table.id && c.statut === 'en_cours')
  }

  async function handleLibererTable(e: React.MouseEvent, table: Table) {
    e.stopPropagation()
    const commande = getCommandeTable(table)
    if (!commande) return
    if (!confirm(`Annuler la commande de la Table ${table.numero} et libérer la table ?`)) return
    setLiberant(table.id)
    try {
      await annulerCommande(commande.id)
      toast.success(`Table ${table.numero} libérée`)
    } finally { setLiberant(null) }
  }

  function handleSelectTable(table: Table) {
    if (table.statut === 'libre') {
      selectionnerTable(table)
      navigate('/ventes/commande')
    } else if (table.statut === 'occupee') {
      const commande = getCommandeTable(table)
      if (commande) { selectionnerTableOccupee(table, commande); navigate('/ventes/commande') }
    }
  }

  function openPaiement(e: React.MouseEvent, table: Table) {
    e.stopPropagation()
    const commande = getCommandeTable(table)
    if (!commande) return
    setModePaiement('Cash')
    setModalPaiement({ table, commande })
  }

  async function handlePayer() {
    if (!modalPaiement) return
    setPayant(true)
    try {
      await payerCommande(modalPaiement.commande.id, modePaiement)
      toast.success(`Table ${modalPaiement.table.numero} — Paiement enregistré (${modePaiement})`)
      setTicketCommandeId(modalPaiement.commande.id)
      setModalPaiement(null)
    } catch {
      toast.error('Erreur lors du paiement')
    } finally { setPayant(false) }
  }

  if (loading) return <div className="plan-loading">Chargement...</div>
  if (erreur) return <div className="plan-erreur">⚠️ Impossible de contacter le serveur.</div>

  const tablesLibres = tables.filter((t) => t.statut === 'libre').length
  const tablesOccupees = tables.filter((t) => t.statut === 'occupee').length
  const caJour = commandes.reduce((sum, c) => sum + c.total, 0)

  return (
    <div className="plan-salle">
      <div className="plan-header">
        <div>
          <h2>Plan de salle</h2>
          <p className="plan-sous-titre">
            {tables.length} tables · <span style={{ color: '#22c55e' }}>{tablesLibres} libres</span> · <span style={{ color: '#ef4444' }}>{tablesOccupees} occupées</span>
          </p>
        </div>
        <div className="plan-header-right">
          <div className="ca-badge">
            <span className="ca-label">CA en cours</span>
            <span className="ca-value">{caJour.toLocaleString()} FC</span>
          </div>
          <div className="legende">
            {Object.entries(STATUT_CONFIG).map(([key, val]) => (
              <div key={key} className="legende-item">
                <span className="legende-dot" style={{ background: val.color }} />
                <span>{val.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {ZONES.map((zone) => {
        const tablesZone = tables.filter((t) => t.zone === zone)
        if (tablesZone.length === 0) return null
        return (
          <div key={zone} className="zone-section">
            <h3 className="zone-titre">{zone.charAt(0).toUpperCase() + zone.slice(1)}</h3>
            <div className="tables-grid">
              {tablesZone.map((table) => {
                const config = STATUT_CONFIG[table.statut]
                const commande = getCommandeTable(table)
                const clickable = table.statut === 'libre' || table.statut === 'occupee'
                return (
                  <button
                    key={table.id}
                    className={`table-tile ${clickable ? 'clickable' : 'non-clickable'}`}
                    style={{ borderColor: config.color, background: `${config.color}18` }}
                    onClick={() => handleSelectTable(table)}
                    title={table.statut === 'occupee' ? 'Modifier la commande' : table.statut === 'libre' ? 'Nouvelle commande' : `Table ${table.statut}`}
                  >
                    <div className="table-numero" style={{ color: config.color }}>Table {table.numero}</div>
                    <div className="table-capacite">{table.capacite} pers.</div>
                    {commande ? (
                      <div className="table-commande-info">
                        <span className="table-nb-articles">{commande.lignes.length} article{commande.lignes.length > 1 ? 's' : ''}</span>
                        <span className="table-total">{commande.total.toLocaleString()} FC</span>
                        <div className="table-actions">
                          <button className="btn-payer" onClick={(e) => openPaiement(e, table)} title="Encaisser">
                            💳 Payer
                          </button>
                          <button
                            className="btn-liberer"
                            onClick={(e) => handleLibererTable(e, table)}
                            disabled={liberant === table.id}
                            title="Annuler et libérer"
                          >
                            {liberant === table.id ? '...' : '✕'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="table-statut" style={{ color: config.color }}>{config.label}</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* MODAL PAIEMENT */}
      {modalPaiement && (
        <div className="modal-overlay" onClick={() => setModalPaiement(null)}>
          <div className="modal-paiement" onClick={(e) => e.stopPropagation()}>
            <div className="modal-paiement-header">
              <h3>Encaisser — Table {modalPaiement.table.numero}</h3>
              <button className="modal-close" onClick={() => setModalPaiement(null)}><X size={20} /></button>
            </div>

            <div className="modal-paiement-body">
              <div className="recap-lignes">
                {modalPaiement.commande.lignes.map((l) => (
                  <div key={l.id} className="recap-ligne">
                    <span>{l.produitNom}</span>
                    <span>x{l.quantite}</span>
                    <span>{(l.prix * l.quantite).toLocaleString()} FC</span>
                  </div>
                ))}
              </div>

              <div className="recap-total">
                TOTAL : <strong>{modalPaiement.commande.total.toLocaleString()} FC</strong>
              </div>

              <div className="modes-paiement">
                <p>Mode de paiement</p>
                <div className="modes-grid">
                  {MODES_PAIEMENT.map((mode) => (
                    <button
                      key={mode}
                      className={`mode-btn ${modePaiement === mode ? 'active' : ''}`}
                      onClick={() => setModePaiement(mode)}
                    >
                      {mode === 'Cash' ? '💵' : mode === 'Mobile Money' ? '📱' : '💳'} {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-paiement-footer">
              <button className="btn-cancel-paiement" onClick={() => setModalPaiement(null)}>Annuler</button>
              <button className="btn-confirmer-paiement" onClick={handlePayer} disabled={payant}>
                <Check size={16} /> {payant ? 'Traitement...' : `Confirmer — ${modalPaiement.commande.total.toLocaleString()} FC`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL TICKET APRES PAIEMENT */}
      {ticketCommandeId && (
        <div className="modal-overlay" onClick={() => setTicketCommandeId(null)}>
          <div className="modal-paiement" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-paiement-header">
              <h3>Paiement confirmé ✓</h3>
              <button className="modal-close" onClick={() => setTicketCommandeId(null)}><X size={20} /></button>
            </div>
            <div className="modal-paiement-body" style={{ alignItems: 'center', textAlign: 'center', gap: 8 }}>
              <div style={{ fontSize: 48 }}>🧾</div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Voulez-vous imprimer le ticket de caisse ?</p>
            </div>
            <div className="modal-paiement-footer">
              <button className="btn-cancel-paiement" onClick={() => setTicketCommandeId(null)}>Non merci</button>
              <button
                className="btn-confirmer-paiement"
                onClick={() => { navigate(`/ticket/${ticketCommandeId}`); setTicketCommandeId(null) }}
              >
                <Printer size={16} /> Voir le ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
