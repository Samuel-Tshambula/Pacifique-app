/**
 * server/models/userStore.ts
 *
 * ÉTAPE 10 — UserDocument implémente BaseDocument.
 * Chiffrement AES ajouté (cohérent avec store.ts).
 * Migration automatique des anciens documents.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import CryptoJS from 'crypto-js'
import { getEncryptionKey } from '../../config/env.js'
import type { UserDocument } from '../../src/types/models.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH   = path.join(__dirname, '../../data/users.json')

// Réexport pour compatibilité
export type User = UserDocument

// ─── Migration ────────────────────────────────────────────────────────────────

function migrateUser(u: any): UserDocument {
  const now = new Date().toISOString()
  return {
    id:             u.id,
    name:           u.name,
    username:       u.username,
    password:       u.password,
    role:           u.role,
    isActive:       u.isActive ?? true,
    failedAttempts: u.failedAttempts ?? 0,
    lockedUntil:    u.lockedUntil ?? null,
    lastLogin:      u.lastLogin ?? null,
    createdAt:      u.createdAt  ?? now,
    updatedAt:      u.updatedAt  ?? u.lastLogin ?? u.createdAt ?? now,
    syncStatus:     u.syncStatus ?? 'pending',
  }
}

// ─── I/O ──────────────────────────────────────────────────────────────────────

function readUsers(): UserDocument[] {
  if (!fs.existsSync(DB_PATH)) return []

  const raw = fs.readFileSync(DB_PATH, 'utf-8')

  // JSON en clair (ancienne version sans chiffrement)
  try {
    const plain = JSON.parse(raw)
    if (Array.isArray(plain)) {
      console.info('[UserStore] Migration chiffrement users.json')
      const migrated = plain.map(migrateUser)
      writeUsers(migrated)
      return migrated
    }
  } catch {
    // Pas du JSON brut
  }

  // Déchiffrement AES
  try {
    const decrypted = CryptoJS.AES.decrypt(raw, getEncryptionKey()).toString(CryptoJS.enc.Utf8)
    const parsed = JSON.parse(decrypted)
    return parsed.map(migrateUser)
  } catch {
    console.warn('[UserStore] users.json illisible — réinitialisation')
    return []
  }
}

function writeUsers(users: UserDocument[]): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const json      = JSON.stringify(users, null, 2)
  const encrypted = CryptoJS.AES.encrypt(json, getEncryptionKey()).toString()
  fs.writeFileSync(DB_PATH, encrypted)
}

// ─── Seed admin par défaut ────────────────────────────────────────────────────

function ensureAdminExists(users: UserDocument[]): UserDocument[] {
  if (users.length > 0) return users

  const now  = new Date().toISOString()
  const hash = bcrypt.hashSync('Admin123!', 12)
  const admin: UserDocument = {
    id:             '1',
    name:           'Administrateur',
    username:       'admin',
    password:       hash,
    role:           'admin',
    isActive:       true,
    failedAttempts: 0,
    lockedUntil:    null,
    lastLogin:      null,
    createdAt:      now,
    updatedAt:      now,
    syncStatus:     'pending',
  }
  return [admin]
}

// ─── API publique ─────────────────────────────────────────────────────────────

export function getUsers(): UserDocument[] {
  const users = readUsers()
  const withAdmin = ensureAdminExists(users)
  if (withAdmin.length !== users.length) {
    writeUsers(withAdmin)
  }
  return withAdmin
}

export function saveUsers(users: UserDocument[]): void {
  writeUsers(users)
}
