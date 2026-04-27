import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { getUsers, saveUsers, User } from '../models/userStore.js'
import { v4 as uuid } from 'uuid'

const router = Router()

// Liste tous les utilisateurs
router.get('/', (_req: Request, res: Response) => {
  const users = getUsers().map(({ password, ...u }) => u)
  res.json(users)
})

// Créer un utilisateur
router.post('/', async (req: Request, res: Response) => {
  const { name, username, password, role } = req.body
  if (!name || !username || !password || !role)
    return res.status(400).json({ message: 'Tous les champs sont requis' })

  const users = getUsers()
  if (users.find((u) => u.username === username))
    return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà utilisé' })

  const hash = await bcrypt.hash(password, 12)
  const newUser: User = {
    id: uuid(),
    name,
    username,
    password: hash,
    role,
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: null,
    createdAt: new Date().toISOString(),
  }
  users.push(newUser)
  saveUsers(users)
  const { password: _, ...safe } = newUser
  res.status(201).json(safe)
})

// Modifier un utilisateur
router.patch('/:id', async (req: Request, res: Response) => {
  const users = getUsers()
  const user = users.find((u) => u.id === req.params.id)
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })

  if (req.body.name) user.name = req.body.name
  if (req.body.username) user.username = req.body.username
  if (req.body.role) user.role = req.body.role
  if (typeof req.body.isActive === 'boolean') user.isActive = req.body.isActive
  if (req.body.password) user.password = await bcrypt.hash(req.body.password, 12)

  // Débloquer
  if (req.body.unlock) { user.failedAttempts = 0; user.lockedUntil = null }

  saveUsers(users)
  const { password: _, ...safe } = user
  res.json(safe)
})

// Supprimer (désactivation logique)
router.delete('/:id', (req: Request, res: Response) => {
  const users = getUsers()
  const user = users.find((u) => u.id === req.params.id)
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })
  user.isActive = false
  saveUsers(users)
  res.json({ message: 'Utilisateur désactivé' })
})

export default router
