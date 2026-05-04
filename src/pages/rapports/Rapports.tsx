import { useEffect, useState } from 'react'
import api from '../../services/api'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { TrendingUp, ShoppingCart, BedDouble, Users, Package, CreditCard } from 'lucide-react'
import './Rapports.css'

const PERIODES = [
  { label: '7 jours',  value: '7' },
  { label: '30 jours', value: '30' },
  { label: '90 jours', value: '90' },
]

const ONGLETS = ['Ventes', 'Hébergement', 'Produits', 'Commandes'] as const
type Onglet = typeof ONGLETS[number]

const PIE_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const MODE_LABELS: Record<string, string> = {
  especes: 'Espèces', carte: 'Carte', mobile: 'Mobile', 'non défini': 'Non défini',
}

export default function Rapports() {
  const [data, setData] = useState<any>(null)
  const [periode, setPeriode] = useState('30')
  const [onglet, setOnglet] = useState<Onglet>('Ventes')

  useEffect(() => {
    setData(null)
    api.get(`/rapports?periode=${periode}`).then((r) => setData(r.data))
  }, [periode])

  if (!data) return <div className="rapports-loading">Chargement des rapports...</div>

  const pieModePaiement = Object.entries(data.parModePaiement).map(([key, val]) => ({
    name: MODE_LABELS[key] || key,
    value: val as number,
  }))

  const pieCategories = data.graphCategories.map((g: any) => ({
    name: g.cat,
    value: g.total,
  }))

  return (
    <div className="rapports-page">
      {/* HEADER */}
      <div className="rapports-header">
        <div>
          <h2>Rapports & Analyses</h2>
          <p>Vue d'ensemble sur les {periode} derniers jours</p>
        </div>
        <div className="periode-selector">
          {PERIODES.map((p) => (
            <button
              key={p.value}
              className={`periode-btn ${periode === p.value ? 'active' : ''}`}
              onClick={() => setPeriode(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI GLOBAUX */}
      <div className="rapports-kpi">
        <div className="r-kpi-card">
          <div className="r-kpi-icon" style={{ background: '#eff6ff' }}><TrendingUp size={20} color="#2563eb" /></div>
          <div>
            <div className="r-kpi-label">Chiffre d'affaires</div>
            <div className="r-kpi-value">{data.totalVentes.toLocaleString()} FC</div>
          </div>
        </div>
        <div className="r-kpi-card">
          <div className="r-kpi-icon" style={{ background: '#f0fdf4' }}><ShoppingCart size={20} color="#22c55e" /></div>
          <div>
            <div className="r-kpi-label">Commandes payées</div>
            <div className="r-kpi-value">{data.nbCommandes}</div>
          </div>
        </div>
        <div className="r-kpi-card">
          <div className="r-kpi-icon" style={{ background: '#fef3c7' }}><CreditCard size={20} color="#f59e0b" /></div>
          <div>
            <div className="r-kpi-label">Panier moyen</div>
            <div className="r-kpi-value">{data.panierMoyen.toLocaleString()} FC</div>
          </div>
        </div>
        <div className="r-kpi-card">
          <div className="r-kpi-icon" style={{ background: '#e0f2fe' }}><BedDouble size={20} color="#0284c7" /></div>
          <div>
            <div className="r-kpi-label">Revenus hébergement</div>
            <div className="r-kpi-value">{data.totalHebergement.toLocaleString()} FC</div>
          </div>
        </div>
        <div className="r-kpi-card">
          <div className="r-kpi-icon" style={{ background: '#fdf4ff' }}><Package size={20} color="#a855f7" /></div>
          <div>
            <div className="r-kpi-label">Taux d'occupation</div>
            <div className="r-kpi-value">{data.tauxOccupation}%</div>
          </div>
        </div>
        <div className="r-kpi-card">
          <div className="r-kpi-icon" style={{ background: '#fff7ed' }}><Users size={20} color="#ea580c" /></div>
          <div>
            <div className="r-kpi-label">Séjours terminés</div>
            <div className="r-kpi-value">{data.nbSejoursTermines}</div>
          </div>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="rapports-onglets">
        {ONGLETS.map((o) => (
          <button key={o} className={`onglet-btn ${onglet === o ? 'active' : ''}`} onClick={() => setOnglet(o)}>
            {o}
          </button>
        ))}
      </div>

      {/* ── VENTES ── */}
      {onglet === 'Ventes' && (
        <div className="rapports-content">
          <div className="r-charts-row">
            <div className="r-chart-card r-chart-large">
              <h3>Évolution des ventes</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.graphVentes}>
                  <defs>
                    <linearGradient id="gVentes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.floor(data.graphVentes.length / 7)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} FC`, 'Ventes']} />
                  <Area type="monotone" dataKey="ventes" stroke="#2563eb" strokeWidth={2} fill="url(#gVentes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="r-chart-card">
              <h3>Modes de paiement</h3>
              {pieModePaiement.length === 0 ? (
                <div className="r-empty">Aucune donnée</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieModePaiement} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieModePaiement.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} FC`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="r-table-card">
            <h3><Users size={16} /> Classement des serveurs</h3>
            {data.classementServeurs.length === 0 ? (
              <div className="r-empty">Aucune vente sur la période</div>
            ) : (
              <table className="r-table">
                <thead>
                  <tr><th>#</th><th>Serveur</th><th>Commandes</th><th>Chiffre d'affaires</th><th>Panier moyen</th></tr>
                </thead>
                <tbody>
                  {data.classementServeurs.map((s: any, i: number) => (
                    <tr key={s.nom}>
                      <td><span className={`rank-badge rank-${i + 1}`}>{i + 1}</span></td>
                      <td className="td-bold">{s.nom}</td>
                      <td>{s.commandes}</td>
                      <td className="td-primary">{s.total.toLocaleString()} FC</td>
                      <td>{Math.round(s.total / s.commandes).toLocaleString()} FC</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── HÉBERGEMENT ── */}
      {onglet === 'Hébergement' && (
        <div className="rapports-content">
          <div className="r-charts-row">
            <div className="r-chart-card r-chart-large">
              <h3>Revenus hébergement</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.graphHebergement}>
                  <defs>
                    <linearGradient id="gHeberg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0284c7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.floor(data.graphHebergement.length / 7)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} FC`, 'Revenus']} />
                  <Area type="monotone" dataKey="revenus" stroke="#0284c7" strokeWidth={2} fill="url(#gHeberg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="r-chart-card">
              <h3>Répartition par type de chambre</h3>
              {Object.keys(data.parTypeChambre).length === 0 ? (
                <div className="r-empty">Aucun séjour terminé</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={Object.entries(data.parTypeChambre).map(([type, v]: any) => ({ type, revenus: v.revenus }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} FC`} />
                    <Bar dataKey="revenus" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="r-stats-row">
            <div className="r-stat-box">
              <div className="r-stat-label">Revenus hébergement</div>
              <div className="r-stat-value blue">{data.totalHebergement.toLocaleString()} FC</div>
            </div>
            <div className="r-stat-box">
              <div className="r-stat-label">Revenus consommations</div>
              <div className="r-stat-value green">{data.totalConsommations.toLocaleString()} FC</div>
            </div>
            <div className="r-stat-box">
              <div className="r-stat-label">Total hébergement</div>
              <div className="r-stat-value">{(data.totalHebergement + data.totalConsommations).toLocaleString()} FC</div>
            </div>
            <div className="r-stat-box">
              <div className="r-stat-label">Chambres occupées</div>
              <div className="r-stat-value orange">{data.sejoursEnCours} ({data.tauxOccupation}%)</div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUITS ── */}
      {onglet === 'Produits' && (
        <div className="rapports-content">
          <div className="r-charts-row">
            <div className="r-chart-card r-chart-large">
              <h3>Ventes par catégorie</h3>
              {pieCategories.length === 0 ? (
                <div className="r-empty">Aucune vente sur la période</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.graphCategories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="cat" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} FC`, 'Ventes']} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {data.graphCategories.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="r-chart-card">
              <h3>Part par catégorie</h3>
              {pieCategories.length === 0 ? (
                <div className="r-empty">Aucune vente</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}>
                      {pieCategories.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} FC`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="r-table-card">
            <h3><Package size={16} /> Top produits vendus</h3>
            {data.topProduits.length === 0 ? (
              <div className="r-empty">Aucune vente sur la période</div>
            ) : (
              <table className="r-table">
                <thead>
                  <tr><th>#</th><th>Produit</th><th>Catégorie</th><th>Qté vendue</th><th>Chiffre d'affaires</th></tr>
                </thead>
                <tbody>
                  {data.topProduits.slice(0, 15).map((p: any, i: number) => (
                    <tr key={p.nom}>
                      <td><span className="rank-num">{i + 1}</span></td>
                      <td className="td-bold">{p.nom}</td>
                      <td><span className="cat-tag">{p.categorie}</span></td>
                      <td>{p.quantite}</td>
                      <td className="td-primary">{p.chiffre.toLocaleString()} FC</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── COMMANDES ── */}
      {onglet === 'Commandes' && (
        <div className="rapports-content">
          <div className="r-table-card">
            <h3><ShoppingCart size={16} /> Dernières commandes payées ({data.dernieresCommandes.length})</h3>
            {data.dernieresCommandes.length === 0 ? (
              <div className="r-empty">Aucune commande sur la période</div>
            ) : (
              <table className="r-table">
                <thead>
                  <tr><th>N°</th><th>Date</th><th>Serveur</th><th>Table</th><th>Type</th><th>Articles</th><th>Mode</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {data.dernieresCommandes.map((c: any) => (
                    <tr key={c.id}>
                      <td className="td-mono">{c.numero}</td>
                      <td>{new Date(c.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{c.serveurNom}</td>
                      <td>Table {c.tableNumero}</td>
                      <td><span className={`type-tag ${c.type}`}>{c.type === 'sur_place' ? 'Sur place' : 'À emporter'}</span></td>
                      <td>{c.nbLignes} art.</td>
                      <td><span className="mode-tag">{MODE_LABELS[c.modePaiement] || c.modePaiement || '—'}</span></td>
                      <td className="td-primary td-bold">{c.total.toLocaleString()} FC</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
