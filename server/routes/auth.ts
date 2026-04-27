import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getUsers, saveUsers } from '../models/userStore.js'

const router = Router()
const MAX_ATTEMPTS = 3
const JWT_SECRET = process.env.JWT_SECRET || 'pacifique_secret_dev'
const JWT_EXPIRES = '24h'

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body

  if (!username || !password)
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis' })

  const users = getUsers()
  const user = users.find((u) => u.username === username)

  if (!user)
    return res.status(401).json({ message: 'Identifiants incorrects' })

  if (!user.isActive)
    return res.status(403).json({ message: 'Compte désactivé. Contactez l\'administrateur' })

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date())
    return res.status(403).json({ message: 'Compte verrouillé. Contactez l\'administrateur' })

  const valid = await bcrypt.compare(password, user.password)

  if (!valid) {
    user.failedAttempts = (user.failedAttempts || 0) + 1
    const remaining = MAX_ATTEMPTS - user.failedAttempts

    if (user.failedAttempts >= MAX_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      saveUsers(users)
      return res.status(403).json({ message: 'Compte verrouillé après 3 tentatives. Contactez l\'administrateur' })
    }

    saveUsers(users)
    return res.status(401).json({ message: `Identifiants incorrects. ${remaining} tentative(s) restante(s)` })
  }

  user.failedAttempts = 0
  user.lockedUntil = null
  user.lastLogin = new Date().toISOString()
  saveUsers(users)

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES })

  res.json({
    token,
    user: { id: user.id, name: user.name, username: user.username, role: user.role },
  })
})

router.post('/unlock/:id', (req: Request, res: Response) => {
  const users = getUsers()
  const user = users.find((u) => u.id === req.params.id)
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })

  user.failedAttempts = 0
  user.lockedUntil = null
  saveUsers(users)
  res.json({ message: 'Compte déverrouillé' })
})

export default router
