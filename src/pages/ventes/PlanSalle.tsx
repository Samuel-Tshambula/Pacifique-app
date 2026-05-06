import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVentesStore } from '../../store/ventesStore'
import { useOrderEvents } from '../../hooks/useOrderEvents'
import type { Table } from '../../store/ventesStore'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Bell, CreditCard, Banknote, Smartphone,
  CheckCircle2, Clock, Utensils, Users,
} from 'lucide-react'
import { sounds } from '../../services/sounds'
import './PlanSalle.css'

const STATUT_CONFIG = {
  libre:     { label: 'Libre',     color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  occupee:   { label: 'Occupée',   color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  reservee:  { label: 'Réservée',  color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  nettoyage: { label: 'Nettoyage', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
}

const ZONES = ['salle', 'terrasse', 'bar'] as const

const MODES_PAIEMENT = [
  { id: 'especes', label: 'Espèces',  icon: Banknote },
  { id: 'carte',   label: 'Carte',    icon: CreditCard },
  { id: 'mobile',  label: 'Mobile',   icon: Smartphone },
]

const STATUT_LIGNE_LABELS: Record<string, string> = {
  en_attente:    'En attente',
  en_preparation:'En préparation',
  pret:          'Prêt',
  servi:         'Servi',
}

export default function PlanSalle() {
  const { tables, commandes, fetchTables, fetchCommandes, selectionnerTable, payerCommande, updateStatutLigne } = useVentesStore()
  const navigate = useNavigate()

  const [tableModal, setTableModal] = useState<Table | null>(null)
  const [modePaiement, setModePaiement] = useState('especes')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    fetchTables()
    fetchCommandes()
    const interval = setInterval(() => { fetchTables(); fetchCommandes() }, 10000)
    return () => clearInterval(interval)
  }, [fetchTables, fetchCommandes])

  // Temps réel Socket.IO
  useOrderEvents({
    onNewOrder: () => { fetchTables(); fetchCommandes() },
    onOrderUpdate: () => { fetchTables(); fetchCommandes() },
    onOrderReady: (payload) => {
      sounds.notification()
      toast(`Table ${payload.tableNumero} — Commande prête !`, {
        duration: 10000,
        icon: '🔔',
        style: { background: '#f0fdf4', border: '2px solid #22c55e', color: '#15803d', fontWeight: '600' },
      })
      fetchTables()
      fetchCommandes()
    },
  })

  const commandesPrêtes = commandes.filter((c) =>
    c.statut === 'prete' ||
    (c.statut === 'en_cours' && c.lignes.every((l) => l.statut === 'pret' || l.statut === 'servi'))
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
      sounds.success()
      toast.success(`Table ${tableModal!.numero} — Paiement enregistré`)
      setTableModal(null)
      navigate(`/ticket/${commande.id}`)
    } catch {
      sounds.error()
      toast.error('Erreur lors du paiement')
    } finally {
      setPaying(false)
    }
  }

  const commandeModal = tableModal ? getCommandeTable(tableModal.id) : null

  return (
    <div className="plan-salle">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
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

      {/* ── Bandeau commandes prêtes ─────────────────────────────────────────── */}
      <AnimatePresence>
        {commandesPrêtes.length > 0 && (
          <motion.div
            className="plats-prets-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <Bell size={18} />
            <span>
              <strong>{commandesPrêtes.length} commande(s) prête(s) à servir :</strong>{' '}
              {commandesPrêtes.map((c) => `Table ${c.tableNumero}`).join(', ')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Zones ───────────────────────────────────────────────────────────── */}
      {ZONES.map((zone) => {
        const tablesZone = tables.filter((t) => t.zone === zone)
        if (tablesZone.length === 0) return null
        return (
          <div key={zone} className="zone-section">
            <h3 className="zone-titre">
              {zone === 'salle' && <Utensils size={16} />}
              {zone === 'terrasse' && <Users size={16} />}
              {zone === 'bar' && <CreditCard size={16} />}
              {zone.charAt(0).toUpperCase() + zone.slice(1)}
            </h3>
            <div className="tables-grid">
              {tablesZone.map((table) => {
                const config = STATUT_CONFIG[table.statut]
                const commande = getCommandeTable(table.id)
                const isPrete = commande && (
                  commande.statut === 'prete' ||
                  commande.lignes.every((l) => l.statut === 'pret' || l.statut === 'servi')
                )
                const isClickable = table.statut === 'libre' || table.statut === 'occupee'
                return (
                  <motion.button
                    key={table.id}
                    className={`table-tile ${isClickable ? 'clickable' : 'non-clickable'} ${isPrete ? 'prete' : ''}`}
                    style={{
                      borderColor: isPrete ? '#22c55e' : config.color,
                      background: isPrete ? 'rgba(34,197,94,0.1)' : config.bg,
                    }}
                    onClick={() => isClickable && handleSelectTable(table)}
                    whileHover={isClickable ? { y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' } : {}}
                    whileTap={isClickable ? { scale: 0.97 } : {}}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="table-numero" style={{ color: isPrete ? '#16a34a' : config.color }}>
                      Table {table.numero}
                    </div>
                    <div className="table-capacite">
                      <Users size={11} /> {table.capacite} pers.
                    </div>
                    {commande && (
                      <div className="table-total">{commande.total.toLocaleString()} FC</div>
                    )}
                    <div className="table-statut" style={{ color: isPrete ? '#16a34a' : config.color }}>
                      {isPrete
                        ? <><CheckCircle2 size={12} /> Prête</>
                        : config.label
                      }
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* ── Modal table occupée ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {tableModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTableModal(null)}
          >
            <motion.div
              className="modal modal-lg"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <h3>Table {tableModal.numero} — {tableModal.zone}</h3>
                  {commandeModal && (
                    <div className="modal-subtitle">
                      <Clock size={13} /> {commandeModal.numero} · {commandeModal.serveurNom}
                    </div>
                  )}
                </div>
                <button className="modal-close" onClick={() => setTableModal(null)}>
                  <X size={20} />
                </button>
              </div>

              {!commandeModal ? (
                <div className="modal-body">
                  <div className="empty-state">Aucune commande active sur cette table</div>
                </div>
              ) : (
                <>
                  <div className="modal-body">
                    <div className="commande-lignes-list">
                      {commandeModal.lignes.map((ligne) => (
                        <div key={ligne.id} className={`commande-ligne-row statut-${ligne.statut}`}>
                          <span className="cl-qte">×{ligne.quantite}</span>
                          <span className="cl-nom">{ligne.produitNom}</span>
                          <span className={`cl-badge statut-badge-${ligne.statut}`}>
                            {STATUT_LIGNE_LABELS[ligne.statut]}
                          </span>
                          <span className="cl-prix">{(ligne.prix * ligne.quantite).toLocaleString()} FC</span>
                          {ligne.statut === 'pret' && (
                            <button className="btn-servi-inline" onClick={() => handleMarquerServi(commandeModal.id, ligne.id)}>
                              <CheckCircle2 size={13} /> Servi
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {commandeModal.notes && (
                      <div className="commande-notes-box">
                        <Bell size={13} /> {commandeModal.notes}
                      </div>
                    )}

                    <div className="commande-total-row">
                      <span>Total</span>
                      <strong>{commandeModal.total.toLocaleString()} FC</strong>
                    </div>

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
                      {paying
                        ? 'Traitement...'
                        : <><CreditCard size={16} /> Encaisser {commandeModal.total.toLocaleString()} FC</>
                      }
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
