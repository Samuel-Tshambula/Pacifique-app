import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

const ROLES_ALERTES = ['serveur', 'admin', 'gestionnaire', 'receptionniste']

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.15, 0.3].forEach((t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.12)
    })
  } catch {
    // AudioContext non disponible
  }
}

export function useNotificationsPlats(setBadgeCount: (n: number) => void) {
  const { user } = useAuthStore()
  const commandesPretes = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user || !ROLES_ALERTES.includes(user.role)) return

    async function check() {
      try {
        const { data } = await api.get('/commandes')
        const pretes: any[] = data.filter((c: any) =>
          c.statut === 'prete' ||
          (c.statut === 'en_cours' && c.lignes.every((l: any) => l.statut === 'pret' || l.statut === 'servi'))
        )

        // Nouvelles commandes prêtes depuis le dernier check
        pretes
          .filter((c) => !commandesPretes.current.has(c.id))
          .forEach((c) => {
            commandesPretes.current.add(c.id)
            playNotificationSound()
            toast(`Table ${c.tableNumero} — Commande prête à servir !`, {
              duration: 12000,
              style: {
                background: '#f0fdf4',
                border: '2px solid #22c55e',
                color: '#15803d',
                fontWeight: '600',
                fontSize: '15px',
                padding: '14px 18px',
              },
              icon: '🔔',
            })
          })

        // Nettoyer les commandes qui ne sont plus prêtes (payées)
        const idsPretes = new Set(pretes.map((c) => c.id))
        commandesPretes.current.forEach((id) => {
          if (!idsPretes.has(id)) commandesPretes.current.delete(id)
        })

        setBadgeCount(pretes.length)
      } catch {
        // silencieux
      }
    }

    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [user])
}
