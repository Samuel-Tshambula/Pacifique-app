import { toast, Toaster } from 'react-hot-toast'
import { 
  CheckCircle, XCircle, AlertTriangle, 
  Info, Bell, Loader2 
} from 'lucide-react'
import { motion } from 'framer-motion'
import { sounds } from '../../services/sounds'

type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface NotificationOptions {
  duration?: number
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  icon?: React.ReactNode
  sound?: boolean
  soundType?: 'success' | 'notification' | 'error' | 'click' | 'checkout'
}

const defaultIcons: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  loading: <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
}

const defaultDurations: Record<NotificationType, number> = {
  success: 4000,
  error: 5000,
  warning: 4500,
  info: 4000,
  loading: Infinity
}

export function showNotification(
  type: NotificationType,
  message: string,
  options: NotificationOptions = {}
) {
  const {
    duration = defaultDurations[type],
    position = 'top-right',
    icon = defaultIcons[type],
    sound = true,
    soundType = type === 'success' ? 'success' : type === 'error' ? 'error' : 'notification'
  } = options

  if (sound) {
    sounds[soundType]()
  }

  const toastOptions = {
    duration,
    position: position as any,
    icon,
    style: {
      background: '#fff',
      color: '#374151',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      maxWidth: '400px'
    }
  }

  switch (type) {
    case 'success':
      return toast.success(message, toastOptions)
    case 'error':
      return toast.error(message, toastOptions)
    case 'warning':
      return toast(message, { ...toastOptions, icon })
    case 'info':
      return toast(message, { ...toastOptions, icon })
    case 'loading':
      return toast.loading(message, toastOptions)
  }
}

// Fonctions utilitaires
export const notify = {
  success: (message: string, options?: NotificationOptions) => 
    showNotification('success', message, options),
  error: (message: string, options?: NotificationOptions) => 
    showNotification('error', message, options),
  warning: (message: string, options?: NotificationOptions) => 
    showNotification('warning', message, options),
  info: (message: string, options?: NotificationOptions) => 
    showNotification('info', message, options),
  loading: (message: string, options?: NotificationOptions) => 
    showNotification('loading', message, options)
}

// Composant Toaster personnalisé
export function NotificationProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: '400px'
        },
        success: {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          style: {
            borderLeft: '4px solid #22c55e'
          }
        },
        error: {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          style: {
            borderLeft: '4px solid #ef4444'
          }
        },
        loading: {
          icon: <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />,
          style: {
            borderLeft: '4px solid #6b7280'
          }
        }
      }}
    >
      {(t) => (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          className="flex items-start gap-3"
        >
          {t.icon}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{t.message as string}</p>
            {t.type === 'loading' && (
              <div className="mt-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 4, ease: 'linear' }}
                />
              </div>
            )}
          </div>
          {t.type !== 'loading' && (
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </Toaster>
  )
}

// Notification de commande
export function showOrderNotification(table: string, items: number) {
  return notify.success(`Commande table ${table} envoyée !`, {
    icon: <Bell className="w-5 h-5 text-green-500" />,
    sound: true,
    soundType: 'success',
    duration: 3000
  })
}

// Notification de stock
export function showStockAlert(product: string, stock: number) {
  return notify.warning(`Stock faible : ${product} (${stock} restants)`, {
    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    sound: true,
    soundType: 'notification',
    duration: 5000
  })
}

// Notification de synchronisation
export function showSyncNotification(synced: boolean, count?: number) {
  if (synced) {
    return notify.success(
      count ? `${count} éléments synchronisés` : 'Synchronisation terminée',
      { duration: 3000 }
    )
  } else {
    return notify.error('Erreur de synchronisation', { duration: 5000 })
  }
}