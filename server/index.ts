import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { startPeriodicSync } from './models/sync'
import authRoutes from './routes/auth.js'
import tablesRoutes from './routes/tables.js'
import produitsRoutes from './routes/produits.js'
import commandesRoutes from './routes/commandes.js'
import utilisateursRoutes from './routes/utilisateurs.js'
import stockRoutes from './routes/stock.js'
import hebergementRoutes from './routes/hebergement.js'
import dashboardRoutes from './routes/dashboard.js'
import rapportsRoutes from './routes/rapports.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Connexion MongoDB (optionnelle, en arrière-plan)
const connectMongoDB = async () => {
  const mongoUri = process.env.MONGODB_URI
  if (mongoUri && mongoUri !== 'mongodb+srv://username:password@cluster.mongodb.net/pacifique?retryWrites=true&w=majority') {
    try {
      await mongoose.connect(mongoUri)
      console.log('Connecté à MongoDB Atlas')
      startPeriodicSync() // Démarrer la sync périodique
    } catch (error) {
      console.warn('Échec connexion MongoDB, mode offline uniquement:', (error as Error).message)
    }
  } else {
    console.log('MONGODB_URI non configuré ou par défaut, mode offline uniquement')
  }
}
connectMongoDB()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/tables', tablesRoutes)
app.use('/api/produits', produitsRoutes)
app.use('/api/commandes', commandesRoutes)
app.use('/api/utilisateurs', utilisateursRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/hebergement', hebergementRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/rapports', rapportsRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// Endpoint sync
app.post('/api/sync', async (_req, res) => {
  if (!mongoose.connection.readyState) {
    return res.status(503).json({ message: 'MongoDB non connecté' })
  }
  try {
    const { syncToCloud, syncFromCloud } = await import('./models/sync')
    const toCloud = await syncToCloud()
    const fromCloud = await syncFromCloud()
    res.json({ toCloud, fromCloud, message: 'Synchronisation terminée' })
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la sync', error: (error as Error).message })
  }
})

app.get('/api/sync/status', (_req, res) => {
  res.json({
    mongodb: mongoose.connection.readyState === 1,
    lastSync: new Date().toISOString() // À améliorer avec un timestamp réel
  })
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

export default app
