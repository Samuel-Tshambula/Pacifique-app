/**
 * src/components/ui/Sidebar.tsx
 *
 * ÉTAPE 7 — Affiche le statut de connexion Socket.IO en bas de la sidebar.
 * L'UI n'est jamais bloquée : le statut est purement informatif.
 */

import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard, ShoppingCart, BedDouble, Package,
  BarChart2, ChefHat, Users, LogOut, Settings,
  Wifi, WifiOff, Loader, CloudOff, Cloud, RefreshCw,
} from 'lucide-react'
import type { SocketStatus } from '../../hooks/useSocket'
import type { OnlineStatus } from '../../hooks/useOnlineStatus'
import type { UseSyncStatusReturn } from '../../hooks/useSyncStatus'
import { disconnectSocket } from '../../services/socket'
import './Sidebar.css'

// ─── Navigation ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Tableau de bord', roles: ['admin', 'gestionnaire', 'comptable'] },
  { to: '/ventes',        icon: ShoppingCart,    label: 'Ventes',          roles: ['admin', 'serveur', 'gestionnaire', 'receptionniste'], badge: true },
  { to: '/cuisine',       icon: ChefHat,         label: 'Cuisine',         roles: ['admin', 'cuisinier', 'gestionnaire'] },
  { to: '/hebergement',   icon: BedDouble,        label: 'Hébergement',     roles: ['admin', 'receptionniste', 'gestionnaire'] },
  { to: '/stock',         icon: Package,          label: 'Stock',           roles: ['admin', 'gestionnaire'] },
  { to: '/rapports',      icon: BarChart2,        label: 'Rapports',        roles: ['admin', 'gestionnaire', 'comptable'] },
  { to: '/utilisateurs',  icon: Users,            label: 'Employés',        roles: ['admin'] },
  { to: '/configuration', icon: Settings,         label: 'Configuration',   roles: ['admin'] },
]

const ROLE_LABELS: Record<string, string> = {
  admin:          'Administrateur',
  serveur:        'Serveur',
  cuisinier:      'Cuisinier',
  receptionniste: 'Réceptionniste',
  gestionnaire:   'Gestionnaire',
  comptable:      'Comptable',
}

// ─── Statut Socket.IO ─────────────────────────────────────────────────────────

const SOCKET_STATUS_CONFIG: Record<SocketStatus, {
  label: string
  color: string
  bg: string
  Icon: React.ElementType
  spin?: boolean
}> = {
  connected: {
    label: 'Temps réel actif',
    color: '#16a34a',
    bg: '#f0fdf4',
    Icon: Wifi,
  },
  connecting: {
    label: 'Connexion...',
    color: '#d97706',
    bg: '#fffbeb',
    Icon: Loader,
    spin: true,
  },
  disconnected: {
    label: 'Hors ligne',
    color: '#6b7280',
    bg: '#f9fafb',
    Icon: WifiOff,
  },
  error: {
    label: 'Erreur réseau',
    color: '#dc2626',
    bg: '#fef2f2',
    Icon: WifiOff,
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  badgeVentes?: number
  socketStatus?: SocketStatus
  onlineStatus?: OnlineStatus
  syncStatus?: UseSyncStatusReturn
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Sidebar({ badgeVentes = 0, socketStatus = 'disconnected', onlineStatus, syncStatus }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    disconnectSocket()
    logout()
    navigate('/login')
  }

  const allowed = NAV_ITEMS.filter((item) => item.roles.includes(user?.role || ''))
  const statusCfg = SOCKET_STATUS_CONFIG[socketStatus]
  const StatusIcon = statusCfg.Icon

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span>🏨</span>
        <span>Pacifique</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {allowed.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
            {badge && badgeVentes > 0 && (
              <span className="nav-badge">{badgeVentes}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Indicateurs de statut ── */}
      <div className="sidebar-status-group">

        {/* Statut Socket.IO — ÉTAPE 7 */}
        <div
          className="sidebar-socket-status"
          style={{ background: statusCfg.bg, color: statusCfg.color }}
          title={`Temps réel : ${statusCfg.label}`}
        >
          <StatusIcon size={13} className={statusCfg.spin ? 'spin' : ''} />
          <span>{statusCfg.label}</span>
        </div>

        {/* Statut réseau — ÉTAPE 8 */}
        {onlineStatus && (
          <div
            className={`sidebar-network-status ${onlineStatus.isOnline ? 'online' : 'offline'}`}
            title={onlineStatus.isOnline ? 'Serveur accessible' : 'Mode hors ligne'}
          >
            {onlineStatus.isOnline
              ? <><Wifi size={13} /><span>En ligne</span></>
              : <><WifiOff size={13} /><span>Hors ligne</span></>
            }
            {onlineStatus.queueStats.pending > 0 && (
              <span className="queue-badge" title={`${onlineStatus.queueStats.pending} action(s) en attente`}>
                {onlineStatus.queueStats.pending}
              </span>
            )}
          </div>
        )}

        {/* Statut sync cloud — ÉTAPE 9 */}
        {syncStatus && (
          <div
            className={`sidebar-sync-status ${syncStatus.status.mongodb ? 'synced' : 'unsynced'}`}
            title={syncStatus.status.mongodb
              ? `Dernière sync : ${syncStatus.status.lastSync ? new Date(syncStatus.status.lastSync).toLocaleTimeString('fr-FR') : 'jamais'}`
              : 'Cloud non connecté'}
            onClick={syncStatus.status.mongodb && !syncStatus.status.isSyncing ? syncStatus.syncNow : undefined}
            style={{ cursor: syncStatus.status.mongodb ? 'pointer' : 'default' }}
          >
            {syncStatus.status.isSyncing
              ? <><RefreshCw size={13} className="spin" /><span>Sync...</span></>
              : syncStatus.status.mongodb
                ? <><Cloud size={13} /><span>Cloud sync</span></>
                : <><CloudOff size={13} /><span>Cloud off</span></>
            }
          </div>
        )}
      </div>

      {/* Footer utilisateur */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{ROLE_LABELS[user?.role || ''] || user?.role}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout} title="Déconnexion">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  )
}
