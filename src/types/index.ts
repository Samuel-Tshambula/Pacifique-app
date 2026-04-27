export type Role = 'admin' | 'receptionniste' | 'serveur' | 'cuisinier' | 'gestionnaire' | 'comptable'

export type User = {
  id: string
  name: string
  email: string
  role: Role
}

export type AuthState = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<string>
  logout: () => void
}
