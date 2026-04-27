import { create } from 'zustand'
import type { AuthState, User } from '../types'
import api from '../services/api'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000
let inactivityTimer: ReturnType<typeof setTimeout> | null = null

function resetTimer(logout: () => void) {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(logout, INACTIVITY_TIMEOUT)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    set({ user: data.user as User, token: data.token, isAuthenticated: true })
    resetTimer(get().logout)
    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach((e) => window.addEventListener(e, () => resetTimer(get().logout)))
    return data.user.role
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    if (inactivityTimer) clearTimeout(inactivityTimer)
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
