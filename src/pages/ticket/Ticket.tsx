import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Printer, ArrowLeft } from 'lucide-react'
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

  return (
    <div className="ticket-page">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="ticket-toolbar no-print">
        <button className="btn-retour" onClick={() => navigate('/ventes')}>
          <ArrowLeft size={16} /> Retour
        </button>
        <button className="btn-imprimer" onClick={() => window.print()}>
          <Printer size={16} /> Imprimer
        </button>
      </div>

      {/* TICKET */}
      <div className="ticket">
        <div className="ticket-entete">
          <div className="ticket-logo">🏨</div>
          <h1 className="ticket-nom-etablissement">Hôtel Pacifique</h1>
          <p className="ticket-sous-titre">Restaurant & Bar</p>
          <div className="ticket-separateur">{'- '.repeat(20)}</div>
        </div>

        <div className="ticket-infos">
          <div className="ticket-info-ligne">
            <span>Facture</span>
            <span>{facture.factureId}</span>
          </div>
          <div className="ticket-info-ligne">
            <span>Commande</span>
            <span>{facture.numeroCommande}</span>
          </div>
          <div className="ticket-info-ligne">
            <span>Date</span>
            <span>{date.toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="ticket-info-ligne">
            <span>Heure</span>
            <span>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="ticket-info-ligne">
            <span>Table</span>
            <span>N° {facture.tableNumero}</span>
          </div>
          <div className="ticket-info-ligne">
            <span>Serveur</span>
            <span>{facture.serveurNom}</span>
          </div>
          <div className="ticket-info-ligne">
            <span>Paiement</span>
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
          <span>TOTAL</span>
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
      </div>
    </div>
  )
}
