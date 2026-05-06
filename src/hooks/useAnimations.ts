import { motion } from 'framer-motion'
import { sounds } from '../services/sounds'

// Animations de base
export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: 'easeOut' }
}

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.3, ease: 'easeOut' }
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.2, ease: 'easeOut' }
}

export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

// Composants animés
export const AnimatedCard = motion.div
export const AnimatedButton = motion.button
export const AnimatedInput = motion.input
export const AnimatedList = motion.ul
export const AnimatedListItem = motion.li

// Hook pour les animations avec sons
export function useAnimatedAction() {
  const withSound = (action: () => void, soundType: 'success' | 'notification' | 'error' | 'click' | 'checkout' = 'click') => {
    return () => {
      sounds[soundType]()
      action()
    }
  }

  const withHoverAnimation = {
    whileHover: { scale: 1.02, y: -2 },
    whileTap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  }

  const withClickAnimation = {
    whileTap: { scale: 0.95 },
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  }

  return {
    withSound,
    withHoverAnimation,
    withClickAnimation
  }
}

// Animations pour les KPI cards
export const kpiCardAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  whileHover: { 
    y: -4,
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  },
  transition: { duration: 0.3, ease: 'easeOut' }
}

// Animation pour les notifications
export const notificationAnimation = {
  initial: { opacity: 0, x: 50, scale: 0.9 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 50, scale: 0.9 },
  transition: { type: 'spring', stiffness: 500, damping: 30 }
}

// Animation pour les chargements
export const loadingAnimation = {
  animate: {
    rotate: 360
  },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'linear'
  }
}

// Animation pour les transitions de page
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
}