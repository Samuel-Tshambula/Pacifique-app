import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../../data/users.json')

export interface User {
  id: string
  name: string
  username: string
  password: string
  role: 'admin' | 'receptionniste' | 'serveur' | 'cuisinier' | 'gestionnaire' | 'comptable'
  isActive: boolean
  failedAttempts: number
  lockedUntil: string | null
  lastLogin: string | null
  createdAt: string
}

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    const hash = bcrypt.hashSync('Admin123!', 12)
    const seed: User[] = [
      {
        id: '1',
        name: 'Administrateur',
        username: 'admin',
        password: hash,
        role: 'admin',
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
        lastLogin: null,
        createdAt: new Date().toISOString(),
      },
    ]
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2))
  }
}

export function getUsers(): User[] {
  ensureDB()
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
}

export function saveUsers(users: User[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2))
}
