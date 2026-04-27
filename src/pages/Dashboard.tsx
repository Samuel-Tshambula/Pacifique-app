import { useEffect, useState } from 'react'
import api from '../services/api'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, ShoppingCart, BedDouble, Package, Trophy } from 'lucide-react'
import './Dashboard.css'

interface DashboardData {
  ventesJour: number
  ventesHier: number
  evolutionVentes: number
  nbCommandes: number
  topProduit: { nom: string; quantite: number; chiffre: number } | null
  classementServeurs: { nom: string; commandes: number; total: number }[]
  graphHeures: { heure: string; ventes: number }[]
  ventes7Jours: { date: string; ventes: number }[]
  sejoursEnCours: number
  totalChambres: number
  revenusHebergement: number
  alertesStock: { nom: string; stock: number; stockMin: number; statut: string }[]
  tempsMoyenPrepa: number | null
  tempsMoyenLivraison: number | null
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data))
    const interval = setInterval(() => api.get('/dashboard').then((r) => setData(r.data)), 30000)
    return () => clearInterval(interval)
  }, [])

  if (!data) return <div className="dash-loading">Chargement du tableau de bord...</div>

  const tauxOccupation = data.totalChambres > 0 ? Math.round((data.sejoursEnCours / data.totalChambres) * 100) : 0

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h2>Tableau de bord</h2>
          <p>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="dash-live"><span className="live-dot" />En direct</div>
      </div>

      {/* KPI CARDS */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#eff6ff' }}><ShoppingCart size={22} color="#2563eb" /></div>
          <div className="kpi-content">
            <div className="kpi-label">Ventes du jour</div>
            <div className="kpi-value">{data.ventesJour.toLocaleString()} FC</div>
            <div className={`kpi-evolution ${data.evolutionVentes >= 0 ? 'positive' : 'negative'}`}>
              {data.evolutionVentes >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(data.evolutionVentes)}% vs hier
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#f0fdf4' }}><ShoppingCart size={22} color="#22c55e" /></div>
          <div className="kpi-content">
            <div className="kpi-label">Commandes du jour</div>
            <div className="kpi-value">{data.nbCommandes}</div>
            <div className="kpi-sub">commandes payées</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#e0f2fe' }}><Package size={22} color="#2563eb" /></div>
          <div className="kpi-content">
            <div className="kpi-label">Préparation moyenne</div>
            <div className="kpi-value">{data.tempsMoyenPrepa !== null ? `${data.tempsMoyenPrepa} min` : 'N/A'}</div>
            <div className="kpi-sub">temps plat prêt</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#ecfdf5' }}><TrendingUp size={22} color="#0f766e" /></div>
          <div className="kpi-content">
            <div className="kpi-label">Livraison moyenne</div>
            <div className="kpi-value">{data.tempsMoyenLivraison !== null ? `${data.tempsMoyenLivraison} min` : 'N/A'}</div>
            <div className="kpi-sub">temps commande → servi</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#fef3c7' }}><BedDouble size={22} color="#f59e0b" /></div>
          <div className="kpi-content">
            <div className="kpi-label">Chambres occupées</div>
            <div className="kpi-value">{data.sejoursEnCours} / {data.totalChambres}</div>
            <div className="kpi-sub">Taux : {tauxOccupation}%</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#fdf2f8' }}><Package size={22} color="#a855f7" /></div>
          <div className="kpi-content">
            <div className="kpi-label">Alertes stock</div>
            <div className="kpi-value" style={{ color: data.alertesStock.length > 0 ? '#ef4444' : '#22c55e' }}>
              {data.alertesStock.length}
            </div>
            <div className="kpi-sub">{data.alertesStock.filter(a => a.statut === 'rupture').length} rupture(s)</div>
          </div>
        </div>
      </div>

      {/* GRAPHIQUES */}
      <div className="charts-grid">
        <div className="chart-card chart-large">
          <h3>Ventes des 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.ventes7Jours}>
              <defs>
                <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()} FC`, 'Ventes']} />
              <Area type="monotone" dataKey="ventes" stroke="#2563eb" strokeWidth={2} fill="url(#colorVentes)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-large">
          <h3>Ventes par heure aujourd'hui</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.graphHeures.filter((_, i) => i % 2 === 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="heure" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()} FC`, 'Ventes']} />
              <Bar dataKey="ventes" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOTTOM GRID */}
      <div className="bottom-grid">
        {/* TOP PRODUIT */}
        <div className="info-card">
          <h3><Trophy size={16} color="#f59e0b" /> Produit le plus vendu</h3>
          {data.topProduit ? (
            <div className="top-produit">
              <div className="top-produit-nom">{data.topProduit.nom}</div>
              <div className="top-produit-stats">
                <span className="stat-badge blue">{data.topProduit.quantite} vendus</span>
                <span className="stat-badge green">{data.topProduit.chiffre.toLocaleString()} FC</span>
              </div>
            </div>
          ) : <div className="empty-state">Aucune vente aujourd'hui</div>}
        </div>

        {/* CLASSEMENT SERVEURS */}
        <div className="info-card">
          <h3>🏆 Classement des serveurs</h3>
          {data.classementServeurs.length === 0 ? (
            <div className="empty-state">Aucune vente aujourd'hui</div>
          ) : (
            <div className="serveurs-list">
              {data.classementServeurs.slice(0, 5).map((s, i) => (
                <div key={s.nom} className="serveur-item">
                  <div className={`serveur-rank rank-${i + 1}`}>{i + 1}</div>
                  <div className="serveur-info">
                    <div className="serveur-nom">{s.nom}</div>
                    <div className="serveur-stats">{s.commandes} commande(s)</div>
                  </div>
                  <div className="serveur-total">{s.total.toLocaleString()} FC</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ALERTES STOCK */}
        <div className="info-card">
          <h3>⚠️ Alertes stock</h3>
          {data.alertesStock.length === 0 ? (
            <div className="empty-state" style={{ color: '#22c55e' }}>✅ Tous les stocks sont normaux</div>
          ) : (
            <div className="alertes-list">
              {data.alertesStock.slice(0, 6).map((a) => (
                <div key={a.nom} className={`alerte-item ${a.statut}`}>
                  <span className="alerte-nom">{a.nom}</span>
                  <span className={`alerte-badge ${a.statut}`}>
                    {a.statut === 'rupture' ? '🔴 Rupture' : `🟠 ${a.stock} restant(s)`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
