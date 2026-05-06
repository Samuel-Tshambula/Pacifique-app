import { useEffect } from 'react'
import { useVentesStore } from '../../store/ventesStore'
import { useOrderEvents } from '../../hooks/useOrderEvents'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChefHat, Clock, CheckCircle2, Flame, UtensilsCrossed } from 'lucide-react'
import { sounds } from '../../services/sounds'
import './Cuisine.css'

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  en_attente:    { label: 'En attente',    color: '#f59e0b', bg: '#fffbeb' },
  en_preparation:{ label: 'En préparation',color: '#3b82f6', bg: '#eff6ff' },
  pret:          { label: 'Prêt',          color: '#22c55e', bg: '#f0fdf4' },
  servi:         { label: 'Servi',         color: '#9ca3af', bg: '#f9fafb' },
}

export default function Cuisine() {
  const { commandes, fetchCommandes, updateStatutLigne } = useVentesStore()

  useEffect(() => {
    fetchCommandes()
    const interval = setInterval(fetchCommandes, 30000)
    return () => clearInterval(interval)
  }, [])

  // Temps réel Socket.IO
  useOrderEvents({
    onNewOrder: (payload) => {
      sounds.notification()
      fetchCommandes()
      toast(`Nouvelle commande — Table ${payload.tableNumero}`, {
        duration: 8000,
        icon: '🆕',
        style: { background: '#eff6ff', border: '2px solid #3b82f6', color: '#1d4ed8', fontWeight: '600' },
      })
    },
    onOrderUpdate: (payload) => {
      if (payload.statut === 'annulee') {
        fetchCommandes()
        toast(`Commande annulée — Table ${payload.tableNumero}`, {
          duration: 6000,
          icon: '❌',
          style: { background: '#fef2f2', border: '2px solid #ef4444', color: '#dc2626' },
        })
      } else {
        fetchCommandes()
      }
    },
  })

  const commandesActives = commandes.filter(
    (c) => c.statut === 'en_cours' && c.lignes.some((l) => l.statut !== 'servi')
  )

  async function handleUpdateStatut(commandeId: string, ligneId: string, statut: string) {
    await updateStatutLigne(commandeId, ligneId, statut as any)
    if (statut === 'pret') {
      sounds.success()
      toast.success('Plat marqué comme prêt !')
    } else if (statut === 'en_preparation') {
      toast('Plat pris en charge', { icon: '👨‍🍳' })
    }
  }

  return (
    <div className="cuisine-screen">
      <div className="cuisine-header">
        <div className="cuisine-title">
          <ChefHat size={24} />
          <h2>Écran Cuisine</h2>
        </div>
        <div className={`cuisine-count ${commandesActives.length > 0 ? 'has-orders' : ''}`}>
          <Flame size={16} />
          {commandesActives.length} commande(s) active(s)
        </div>
      </div>

      {commandesActives.length === 0 ? (
        <motion.div
          className="cuisine-vide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <UtensilsCrossed size={48} strokeWidth={1.5} />
          <span>Aucune commande en attente</span>
        </motion.div>
      ) : (
        <div className="cuisine-grid">
          <AnimatePresence>
            {commandesActives.map((commande) => {
              const lignesActives = commande.lignes.filter((l) => l.statut !== 'servi')
              const minutesEcoulees = Math.floor(
                (Date.now() - new Date(commande.createdAt).getTime()) / 60000
              )
              const isUrgent = minutesEcoulees >= 15

              return (
                <motion.div
                  key={commande.id}
                  className={`commande-card ${isUrgent ? 'urgent' : ''}`}
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  layout
                >
                  <div className="card-header">
                    <span className="card-table">Table {commande.tableNumero}</span>
                    <span className="card-numero">{commande.numero}</span>
                    <span className={`card-heure ${isUrgent ? 'urgent' : ''}`}>
                      <Clock size={12} />
                      {minutesEcoulees}min
                    </span>
                  </div>

                  {commande.notes && (
                    <div className="card-notes">{commande.notes}</div>
                  )}

                  <div className="card-lignes">
                    {lignesActives.map((ligne) => {
                      const cfg = STATUT_CONFIG[ligne.statut]
                      return (
                        <div key={ligne.id} className="ligne-cuisine" style={{ background: cfg.bg }}>
                          <div className="ligne-info">
                            <span className="ligne-qte">×{ligne.quantite}</span>
                            <span className="ligne-nom">{ligne.produitNom}</span>
                            {ligne.notes && <span className="ligne-note">({ligne.notes})</span>}
                          </div>
                          <div className="ligne-bottom">
                            <span className="ligne-statut" style={{ color: cfg.color }}>
                              {cfg.label}
                            </span>
                            <div className="ligne-actions">
                              {ligne.statut === 'en_attente' && (
                                <button
                                  className="btn-cuisine btn-prendre"
                                  onClick={() => handleUpdateStatut(commande.id, ligne.id, 'en_preparation')}
                                >
                                  <Flame size={13} /> Prendre en charge
                                </button>
                              )}
                              {ligne.statut === 'en_preparation' && (
                                <button
                                  className="btn-cuisine btn-pret"
                                  onClick={() => handleUpdateStatut(commande.id, ligne.id, 'pret')}
                                >
                                  <CheckCircle2 size={13} /> Prêt
                                </button>
                              )}
                              {ligne.statut === 'pret' && (
                                <button
                                  className="btn-cuisine btn-servi"
                                  onClick={() => handleUpdateStatut(commande.id, ligne.id, 'servi')}
                                >
                                  <UtensilsCrossed size={13} /> Servi
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
