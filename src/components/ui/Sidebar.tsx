import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LayoutDashboard, ShoppingCart, BedDouble, Package, BarChart2, ChefHat, Users, LogOut } from 'lucide-react'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord', roles: ['admin', 'gestionnaire', 'comptable'] },
  { to: '/ventes',       icon: ShoppingCart,    label: 'Ventes',          roles: ['admin', 'serveur', 'gestionnaire', 'receptionniste'], badge: true },
  { to: '/cuisine',      icon: ChefHat,         label: 'Cuisine',         roles: ['admin', 'cuisinier', 'gestionnaire'] },
  { to: '/hebergement',  icon: BedDouble,        label: 'Hébergement',     roles: ['admin', 'receptionniste', 'gestionnaire'] },
  { to: '/stock',        icon: Package,          label: 'Stock',           roles: ['admin', 'gestionnaire'] },
  { to: '/rapports',     icon: BarChart2,        label: 'Rapports',        roles: ['admin', 'gestionnaire', 'comptable'] },
  { to: '/utilisateurs', icon: Users,            label: 'Employés',        roles: ['admin'] },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  serveur: 'Serveur',
  cuisinier: 'Cuisinier',
  receptionniste: 'Réceptionniste',
  gestionnaire: 'Gestionnaire',
  comptable: 'Comptable',
}

interface SidebarProps {
  badgeVentes?: number
}

export default function Sidebar({ badgeVentes = 0 }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const allowed = NAV_ITEMS.filter((item) => item.roles.includes(user?.role || ''))

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>🏨</span>
        <span>Pacifique</span>
      </div>

      <nav className="sidebar-nav">
        {allowed.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={20} />
            <span>{label}</span>
            {badge && badgeVentes > 0 && (
              <span className="nav-badge">{badgeVentes}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{user?.name[0]}</div>
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
