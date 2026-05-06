import { useEffect, useState, useRef } from 'react'
import api from '../services/api'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingCart,
  BedDouble, Package, Trophy, Clock,
  AlertCircle, CheckCircle, AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  fadeIn, slideIn, scaleIn, staggerChildren,
  kpiCardAnimation, useAnimatedAction,
  AnimatedCard, AnimatedButton
} from '../hooks/useAnimations'
import { sounds } from '../services/sounds'
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
  revenusHebergementJour: number
  alertesStock: { nom: string; stock: number; stockMin: number; statut: string }[]
  tempsMoyenPrepa: number | null
  tempsMoyenLivraison: number | null
}

function formatFC(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M FC`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}k FC`
  return `${value.toLocaleString('fr-FR')} FC`
}

function TooltipFC({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: '#fff', border: '1px solid #e5e7eb',
        borderRadius: 8, padding: '8px 12px', fontSize: 13,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#2563eb', fontWeight: 700 }}>
        {Number(payload[0].value).toLocaleString('fr-FR')} FC
      </div>
    </motion.div>
  )
}

export default function DashboardEnhanced() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { withSound, withHoverAnimation } = useAnimatedAction()

  const fetchData = () =>
    api.get('/dashboard')
      .then((r) => { 
        setData(r.data); 
        setLastUpdate(new Date())
        if (isRefreshing) {
          sounds.success()
          setIsRefreshing(false)
        }
      })
      .catch(() => {
        if (isRefreshing) {
          sounds.error()
          setIsRefreshing(false)
        }
      })

  const handleRefresh = withSound(() => {
    setIsRefreshing(true)
    fetchData()
  }, 'click')

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Scroll automatique vers la droite (heure actuelle) à chaque refresh
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [data])

  if (!data) {
    return (
      <motion.div 
        className="dash-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="dash-loading-spinner" />
        Chargement du tableau de bord...
      </motion.div>
    )
  }

  const tauxOccupation = data.totalChambres > 0
    ? Math.round((data.sejoursEnCours / data.totalChambres) * 100)
    : 0

  // 52px par barre — largeur fixe pour le BarChart scrollable
  const barChartWidth = Math.max(data.graphHeures.length * 52, 400)

  const kpiCards = [
    {
      icon: ShoppingCart,
      iconColor: '#2563eb',
      bgColor: '#eff6ff',
      label: 'Ventes du jour',
      value: formatFC(data.ventesJour),
      evolution: data.evolutionVentes,
      detail: data.ventesHier > 0 ? `(${formatFC(data.ventesHier)})` : null,
    },
    {
      icon: ShoppingCart,
      iconColor: '#22c55e',
      bgColor: '#f0fdf4',
      label: 'Commandes du jour',
      value: data.nbCommandes,
      sub: data.nbCommandes === 0
        ? 'Aucune commande payée'
        : `Moy. ${formatFC(Math.round(data.ventesJour / data.nbCommandes))} / cmd`,
    },
    {
      icon: Clock,
      iconColor: '#0284c7',
      bgColor: '#e0f2fe',
      label: 'Préparation moy.',
      value: data.tempsMoyenPrepa !== null ? `${data.tempsMoyenPrepa} min` : '—',
      sub: data.tempsMoyenLivraison !== null
        ? `Livraison : ${data.tempsMoyenLivraison} min`
        : 'Pas encore de données',
    },
    {
      icon: BedDouble,
      iconColor: '#f59e0b',
      bgColor: '#fef3c7',
      label: 'Chambres occupées',
      value: `${data.sejoursEnCours} / ${data.totalChambres}`,
      sub: `Taux : ${tauxOccupation}%`,
    },
    {
      icon: BedDouble,
      iconColor: '#7c3aed',
      bgColor: '#f5f3ff',
      label: 'Revenus hébergement',
      value: formatFC(data.revenusHebergement),
      sub: data.revenusHebergementJour > 0
        ? `Aujourd'hui : ${formatFC(data.revenusHebergementJour)}`
        : 'Séjours en cours',
    },
    {
      icon: Package,
      iconColor: '#a855f7',
      bgColor: '#fdf2f8',
      label: 'Alertes stock',
      value: data.alertesStock.length,
      valueColor: data.alertesStock.length > 0 ? '#ef4444' : '#22c55e',
      sub: `${data.alertesStock.filter((a) => a.statut === 'rupture').length} rupture(s) · ${data.alertesStock.filter((a) => a.statut === 'faible').length} faible(s)`,
    },
  ]

  return (
    <motion.div 
      className="dashboard"
      initial="initial"
      animate="animate"
      variants={staggerChildren}
    >
      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <motion.div className="dash-header" variants={fadeIn}>
        <div>
          <h2>Tableau de bord</h2>
          <p>{new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="dash-update">
            Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="dash-live"><span className="live-dot" />En direct</div>
          <AnimatedButton
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            {...withHoverAnimation}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: 'var(--text-sm)',
              color: 'var(--gray-600)',
            }}
          >
            {isRefreshing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⟳
              </motion.div>
            ) : '⟳'}
            Actualiser
          </AnimatedButton>
        </div>
      </motion.div>

      {/* ── KPI ─────────────────────────────────────────────────────────────── */}
      <motion.div className="kpi-grid" variants={staggerChildren}>
        <AnimatePresence>
          {kpiCards.map((kpi, index) => (
            <motion.div
              key={kpi.label}
              className="kpi-card"
              variants={kpiCardAnimation}
              custom={index}
              layout
            >
              <div className="kpi-icon" style={{ background: kpi.bgColor }}>
                <kpi.icon size={22} color={kpi.iconColor} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">{kpi.label}</div>
                <div 
                  className="kpi-value" 
                  style={kpi.valueColor ? { color: kpi.valueColor } : {}}
                >
                  {kpi.value}
                </div>
                {kpi.evolution !== undefined ? (
                  <div className={`kpi-evolution ${kpi.evolution >= 0 ? 'positive' : 'negative'}`}>
                    {kpi.evolution >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {kpi.evolution > 0 ? '+' : ''}{kpi.evolution}% vs hier
                    {kpi.detail && (
                      <span className="kpi-evolution-detail"> {kpi.detail}</span>
                    )}
                  </div>
                ) : (
                  <div className="kpi-sub">{kpi.sub}</div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ── Graphique 7 jours (pleine largeur) ──────────────────────────────── */}
      <AnimatedCard className="chart-card chart-full" variants={fadeIn}>
        <h3>Ventes des 7 derniers jours</h3>
        {data.ventes7Jours.every((d) => d.ventes === 0) ? (
          <div className="chart-empty">Aucune vente sur les 7 derniers jours</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.ventes7Jours} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                width={45}
              />
              <Tooltip content={<TooltipFC />} />
              <Area
                type="monotone"
                dataKey="ventes"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#colorVentes)"
                dot={{ r: 3, fill: '#2563eb' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </AnimatedCard>

      {/* ── Graphique heures (pleine largeur, scrollable) ────────────────────── */}
      <AnimatedCard className="chart-card chart-full" variants={fadeIn}>
        <div className="chart-header">
          <h3>
            Ventes par heure aujourd'hui
            {data.graphHeures.length === 0 && (
              <span className="chart-subtitle"> — journée non commencée</span>
            )}
          </h3>
          {data.graphHeures.length > 0 && (
            <span className="chart-hint">⟵ défilement ⟶</span>
          )}
        </div>
        {data.graphHeures.length === 0 || data.graphHeures.every((h) => h.ventes === 0) ? (
          <div className="chart-empty">Aucune vente enregistrée aujourd'hui</div>
        ) : (
          <div className="chart-scroll-wrapper" ref={scrollRef}>
            <BarChart
              width={barChartWidth}
              height={220}
              data={data.graphHeures}
              margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="heure" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                width={45}
              />
              <Tooltip content={<TooltipFC />} />
              <Bar dataKey="ventes" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </div>
        )}
      </AnimatedCard>

      {/* ── Bas de page ─────────────────────────────────────────────────────── */}
      <motion.div className="bottom-grid" variants={staggerChildren}>
        <AnimatedCard className="info-card" variants={slideIn}>
          <h3><Trophy size={16} color="#f59e0b" /> Produit le plus vendu</h3>
          {data.topProduit ? (
            <motion.div 
              className="top-produit"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="top-produit-nom">{data.topProduit.nom}</div>
              <div className="top-produit-stats">
                <span className="stat-badge blue">{data.topProduit.quantite} vendu(s)</span>
                <span className="stat-badge green">{formatFC(data.topProduit.chiffre)}</span>
              </div>
            </motion.div>
          ) : (
            <div className="empty-state">Aucune vente aujourd'hui</div>
          )}
        </AnimatedCard>

        <AnimatedCard className="info-card" variants={slideIn}>
          <h3><Trophy size={16} color="#f59e0b" /> Classement des serveurs</h3>
          {data.classementServeurs.length === 0 ? (
            <div className="empty-state">Aucune vente aujourd'hui</div>
          ) : (
            <div className="serveurs-list">
              {data.classementServeurs.slice(0, 5).map((s, i) => (
                <motion.div 
                  key={s.nom} 
                  className="serveur-item"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ backgroundColor: 'var(--gray-100)' }}
                >
                  <div className={`serveur-rank rank-${i + 1}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <div className="serveur-info">
                    <div className="serveur-nom">{s.nom}</div>
                    <div className="serveur-stats">{s.commandes} commande(s)</div>
                  </div>
                  <div className="serveur-total">{formatFC(s.total)}</div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatedCard>

        <AnimatedCard className="info-card" variants={slideIn}>
          <h3><AlertCircle size={16} color="#ef4444" /> Alertes stock</h3>
          {data.alertesStock.length === 0 ? (
            <div className="empty-state" style={{ color: '#22c55e' }}>
              <CheckCircle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Tous les stocks sont normaux
            </div>
          ) : (
            <div className="alertes-list">
              {data.alertesStock.slice(0, 6).map((a, i) => (
                <motion.div 
                  key={a.nom} 
                  className={`alerte-item ${a.statut}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="alerte-nom">{a.nom}</span>
                  <span className={`alerte-badge ${a.statut}`}>
                    {a.statut === 'rupture' ? (
                      <>
                        <AlertCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Rupture
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {a.stock} / {a.stockMin} min
                      </>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatedCard>
      </motion.div>
    </motion.div>
  )
}