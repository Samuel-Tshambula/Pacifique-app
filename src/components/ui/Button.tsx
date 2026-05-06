import { motion } from 'framer-motion'
import { sounds } from '../../services/sounds'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  withSound?: boolean
  soundType?: 'click' | 'success' | 'error' | 'notification' | 'checkout'
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  type = 'button',
  withSound = true,
  soundType = 'click'
}: ButtonProps) {
  const handleClick = () => {
    if (withSound && !disabled && !loading) {
      sounds[soundType]()
    }
    if (onClick && !disabled && !loading) {
      onClick()
    }
  }

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-hover border-primary',
    success: 'bg-success text-white hover:bg-success-hover border-success',
    danger: 'bg-danger text-white hover:bg-danger-hover border-danger',
    warning: 'bg-warning text-white hover:bg-warning-hover border-warning',
    outline: 'bg-transparent text-gray-700 hover:bg-gray-50 border-gray-300'
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  const baseClasses = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''}`

  return (
    <motion.button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={handleClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
        </motion.div>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      <span className={loading ? 'opacity-70' : ''}>{children}</span>
    </motion.button>
  )
}

// Variantes de bouton prédéfinies
export const PrimaryButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="primary" {...props} />
)

export const SuccessButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="success" {...props} />
)

export const DangerButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="danger" {...props} />
)

export const OutlineButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="outline" {...props} />
)