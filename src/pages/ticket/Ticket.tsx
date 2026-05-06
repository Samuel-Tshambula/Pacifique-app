import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import useSound from 'use-sound'
import { motion } from 'framer-motion'
import { Printer, ArrowLeft, Receipt, Calendar, Clock, Hash, User, CreditCard } from 'lucide-react'
import './Ticket.css'

interface LigneFacture {
  designation: string
  quantite: number
  prixUnitaire: number
  montant: number
}

interface Facture {
  factureId: string
  date: string
  numeroCommande: string
  serveurNom: string
  tableNumero: number
  type: string
  modePaiement: string
  lignes: LigneFacture[]
  totalTTC: number
  notes: string
}

export default function Ticket() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [facture, setFacture] = useState<Facture | null>(null)
  const [erreur, setErreur] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [playPrint] = useSound('/sounds/print-confirmation.wav', { volume: 0.4 })

  const electronPrintAvailable = typeof window !== 'undefined' && typeof window.api?.printTicket === 'function'

  useEffect(() => {
    api.get(`/commandes/${id}/facture`)
      .then(({ data }) => setFacture(data))
      .catch(() => setErreur(true))
  }, [id])

  if (erreur) return (
    <div className="ticket-erreur">
      <p>Facture introuvable.</p>
      <button onClick={() => navigate('/ventes')}>← Retour</button>
    </div>
  )

  if (!facture) return <div className="ticket-loading">Chargement...</div>

  const date = new Date(facture.date)

  async function handlePrintThermal() {
    if (!electronPrintAvailable) return
    const electronApi = window.api
    if (!electronApi) return
    setPrinting(true)
    try {
      await electronApi.printTicket()
      playPrint()
      toast.success('Ticket envoyé à l’imprimante thermique')
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de l’impression thermique')
    } finally {
      setPrinting(false)
    }
  }

  function handlePreviewPrint() {
    window.print()
    playPrint()
  }

  return (
    <div className="ticket-page">
      <div className="ticket-toolbar no-print">
        <button className="btn-retour" onClick={() => navigate('/ventes')}>
          <ArrowLeft size={16} /> Retour
        </button>
        <button className="btn-imprimer btn-preview" onClick={handlePreviewPrint}>
          <Printer size={16} /> Prévisualiser
        </button>
        {electronPrintAvailable && (
          <button className="btn-imprimer btn-thermal" onClick={handlePrintThermal} disabled={printing}>
            <Printer size={16} /> {printing ? 'Impression...' : 'Impression thermique'}
          </button>
        )}
      </div>

      <motion.div
        className="ticket"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="ticket-entete">
          <div className="ticket-logo"><Receipt size={32} /></div>
          <h1 className="ticket-nom-etablissement">Hôtel Pacifique</h1>
          <p className="ticket-sous-titre">Restaurant & Bar</p>
          <div className="ticket-separateur">{'- '.repeat(20)}</div>
        </div>

        <div className="ticket-hint">
          Aperçu avant impression. Utilisez le mode thermique si votre application est lancée en mode bureau.
        </div>

        <div className="ticket-infos">
          <div className="ticket-info-ligne">
            <div className="ticket-info-label"><Hash size={14} /> Facture</div>
            <span>{facture.factureId}</span>
          </div>
          <div className="ticket-info-ligne">
            <div className="ticket-info-label"><Receipt size={14} /> Commande</div>
            <span>{facture.numeroCommande}</span>
          </div>
          <div className="ticket-info-ligne">
            <div className="ticket-info-label"><Calendar size={14} /> Date</div>
            <span>{date.toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="ticket-info-ligne">
            <div className="ticket-info-label"><Clock size={14} /> Heure</div>
            <span>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="ticket-info-ligne">
            <div className="ticket-info-label"><Hash size={14} /> Table</div>
            <span>N° {facture.tableNumero}</span>
          </div>
          <div className="ticket-info-ligne">
            <div className="ticket-info-label"><User size={14} /> Serveur</div>
            <span>{facture.serveurNom}</span>
          </div>
          <div className="ticket-info-ligne">
            <div className="ticket-info-label"><CreditCard size={14} /> Paiement</div>
            <span>{facture.modePaiement}</span>
          </div>
        </div>

        <div className="ticket-separateur">{'- '.repeat(20)}</div>

        <div className="ticket-lignes-header">
          <span>Désignation</span>
          <span>Qté</span>
          <span>Montant</span>
        </div>

        <div className="ticket-separateur">{'- '.repeat(20)}</div>

        <div className="ticket-lignes">
          {facture.lignes.map((l, i) => (
            <div key={i} className="ticket-ligne">
              <span className="ticket-ligne-nom">{l.designation}</span>
              <div className="ticket-ligne-detail">
                <span>{l.prixUnitaire.toLocaleString()} x{l.quantite}</span>
                <span className="ticket-ligne-montant">{l.montant.toLocaleString()} FC</span>
              </div>
            </div>
          ))}
        </div>

        <div className="ticket-separateur">{'= '.repeat(20)}</div>

        <div className="ticket-total">
          <span>Total</span>
          <span>{facture.totalTTC.toLocaleString()} FC</span>
        </div>

        <div className="ticket-separateur">{'= '.repeat(20)}</div>

        {facture.notes && (
          <div className="ticket-notes">Note : {facture.notes}</div>
        )}

        <div className="ticket-pied">
          <p>Merci de votre visite !</p>
          <p>À bientôt à l'Hôtel Pacifique</p>
        </div>
      </motion.div>
    </div>
  )
}
