import {
  Building2, Utensils, Bed, Package, BarChart3, 
  User, Lock, Eye, EyeOff, Check, AlertTriangle,
  Shield, WifiOff, Ban, Key, Crown, ChefHat,
  Bell, Users, Calculator, TrendingUp, TrendingDown,
  ShoppingCart, Clock, Trophy, AlertCircle,
  Home, Settings, LogOut, Menu, X,
  Plus, Edit, Trash2, Save, Download,
  Printer, Filter, Search, RefreshCw,
  Calendar, DollarSign, Percent, Star,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  MoreVertical, Info, HelpCircle, ExternalLink,
  Mail, Phone, MapPin, Globe, CreditCard,
  CheckCircle, XCircle, Loader2
} from 'lucide-react'

// Icônes pour les rôles
export const RoleIcons = {
  admin: Crown,
  serveur: Users,
  cuisinier: ChefHat,
  receptionniste: Building2,
  gestionnaire: BarChart3,
  comptable: Calculator,
}

// Icônes pour les fonctionnalités
export const FeatureIcons = {
  restaurant: Utensils,
  hebergement: Bed,
  stock: Package,
  dashboard: BarChart3,
}

// Icônes pour les erreurs
export const ErrorIcons = {
  credentials: Key,
  locked: Lock,
  disabled: Ban,
  network: WifiOff,
  generic: AlertTriangle,
}

// Icônes pour les actions
export const ActionIcons = {
  add: Plus,
  edit: Edit,
  delete: Trash2,
  save: Save,
  download: Download,
  print: Printer,
  filter: Filter,
  search: Search,
  refresh: RefreshCw,
}

// Icônes pour la navigation
export const NavIcons = {
  home: Home,
  dashboard: BarChart3,
  settings: Settings,
  logout: LogOut,
  menu: Menu,
  close: X,
}

// Icônes pour les statuts
export const StatusIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
}

// Icônes pour les KPI
export const KpiIcons = {
  sales: ShoppingCart,
  orders: ShoppingCart,
  time: Clock,
  occupancy: Bed,
  revenue: DollarSign,
  stock: Package,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  trophy: Trophy,
  alert: AlertCircle,
}

// Icônes utilitaires
export const UtilityIcons = {
  user: User,
  lock: Lock,
  eye: Eye,
  eyeOff: EyeOff,
  check: Check,
  calendar: Calendar,
  percent: Percent,
  star: Star,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  more: MoreVertical,
  help: HelpCircle,
  external: ExternalLink,
  mail: Mail,
  phone: Phone,
  mapPin: MapPin,
  globe: Globe,
  creditCard: CreditCard,
  bell: Bell,
}

// Composant d'icône avec taille et couleur par défaut
interface IconProps {
  icon: keyof typeof UtilityIcons | keyof typeof RoleIcons | keyof typeof FeatureIcons | keyof typeof ErrorIcons | keyof typeof ActionIcons | keyof typeof NavIcons | keyof typeof StatusIcons | keyof typeof KpiIcons
  size?: number
  color?: string
  className?: string
}

export function Icon({ icon, size = 20, color, className = '' }: IconProps) {
  // Chercher l'icône dans toutes les catégories
  const IconComponent = 
    RoleIcons[icon as keyof typeof RoleIcons] ||
    FeatureIcons[icon as keyof typeof FeatureIcons] ||
    ErrorIcons[icon as keyof typeof ErrorIcons] ||
    ActionIcons[icon as keyof typeof ActionIcons] ||
    NavIcons[icon as keyof typeof NavIcons] ||
    StatusIcons[icon as keyof typeof StatusIcons] ||
    KpiIcons[icon as keyof typeof KpiIcons] ||
    UtilityIcons[icon as keyof typeof UtilityIcons]

  if (!IconComponent) {
    console.warn(`Icon "${icon}" not found`)
    return null
  }

  return <IconComponent size={size} color={color} className={className} />
}

// Export de toutes les icônes individuelles pour un usage direct
export {
  Building2, Utensils, Bed, Package, BarChart3, 
  User, Lock, Eye, EyeOff, Check, AlertTriangle,
  Shield, WifiOff, Ban, Key, Crown, ChefHat,
  Bell, Users, Calculator, TrendingUp, TrendingDown,
  ShoppingCart, Clock, Trophy, AlertCircle,
  Home, Settings, LogOut, Menu, X,
  Plus, Edit, Trash2, Save, Download,
  Printer, Filter, Search, RefreshCw,
  Calendar, DollarSign, Percent, Star,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  MoreVertical, Info, HelpCircle, ExternalLink,
  Mail, Phone, MapPin, Globe, CreditCard,
  CheckCircle, XCircle, Loader2
}