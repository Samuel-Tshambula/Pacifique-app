import mongoose from 'mongoose'
import { getUsers, saveUsers } from './userStore.js'
import { getCommandes, saveCommandes } from './store.js'
import { getProduits, saveProduits } from './store.js'
import { getTables, saveTables } from './store.js'
import { getSejours, saveSejours } from './hebergementStore.js'

// Schémas MongoDB (simplifiés pour sync)
const UserSchema = new mongoose.Schema({
  id: String,
  name: String,
  username: String,
  password: String,
  role: String,
  isActive: Boolean,
  failedAttempts: Number,
  lockedUntil: String,
  lastLogin: String,
  createdAt: String,
  updatedAt: { type: String, default: () => new Date().toISOString() }
})

const CommandeSchema = new mongoose.Schema({
  id: String,
  numero: String,
  serveurId: String,
  serveurNom: String,
  tableId: String,
  tableNumero: Number,
  type: String,
  statut: String,
  lignes: Array,
  total: Number,
  notes: String,
  createdAt: String,
  updatedAt: String,
  modePaiement: String,
  syncedAt: { type: String, default: () => new Date().toISOString() }
})

const ProduitSchema = new mongoose.Schema({
  id: String,
  code: String,
  nom: String,
  prix: Number,
  categorie: String,
  stock: Number,
  stockMin: Number,
  unite: String,
  actif: Boolean,
  syncedAt: { type: String, default: () => new Date().toISOString() }
})

const TableSchema = new mongoose.Schema({
  id: String,
  numero: Number,
  zone: String,
  capacite: Number,
  statut: String,
  syncedAt: { type: String, default: () => new Date().toISOString() }
})

const SejourSchema = new mongoose.Schema({
  id: String,
  chambreId: String,
  chambreNumero: String,
  clientNom: String,
  clientPrenom: String,
  clientEmail: String,
  clientPiece: String,
  nombrePersonnes: Number,
  dateArrivee: String,
  dateDepart: String,
  nuits: Number,
  tarifNuit: Number,
  consommations: Array,
  statut: String,
  modePaiement: String,
  totalHebergement: Number,
  totalConsommations: Number,
  createdAt: String,
  updatedAt: String,
  syncedAt: { type: String, default: () => new Date().toISOString() }
})

const UserModel = mongoose.model('User', UserSchema)
const CommandeModel = mongoose.model('Commande', CommandeSchema)
const ProduitModel = mongoose.model('Produit', ProduitSchema)
const TableModel = mongoose.model('Table', TableSchema)
const SejourModel = mongoose.model('Sejour', SejourSchema)

// Fonction de synchronisation bidirectionnelle
export async function syncToCloud() {
  if (!mongoose.connection.readyState) return false

  try {
    // Sync utilisateurs
    const localUsers = getUsers()
    for (const user of localUsers) {
      await UserModel.findOneAndUpdate({ id: user.id }, { ...user, syncedAt: new Date().toISOString() }, { upsert: true })
    }

    // Sync commandes
    const localCommandes = getCommandes()
    for (const commande of localCommandes) {
      await CommandeModel.findOneAndUpdate({ id: commande.id }, { ...commande, syncedAt: new Date().toISOString() }, { upsert: true })
    }

    // Sync produits
    const localProduits = getProduits()
    for (const produit of localProduits) {
      await ProduitModel.findOneAndUpdate({ id: produit.id }, { ...produit, syncedAt: new Date().toISOString() }, { upsert: true })
    }

    // Sync tables
    const localTables = getTables()
    for (const table of localTables) {
      await TableModel.findOneAndUpdate({ id: table.id }, { ...table, syncedAt: new Date().toISOString() }, { upsert: true })
    }

    // Sync séjours
    const localSejours = getSejours()
    for (const sejour of localSejours) {
      await SejourModel.findOneAndUpdate({ id: sejour.id }, { ...sejour, syncedAt: new Date().toISOString() }, { upsert: true })
    }

    console.log('Synchronisation vers le cloud terminée')
    return true
  } catch (error) {
    console.error('Erreur lors de la sync vers cloud:', error)
    return false
  }
}

export async function syncFromCloud() {
  if (!mongoose.connection.readyState) return false

  try {
    // Sync utilisateurs (fusion)
    const cloudUsers = await UserModel.find({})
    const localUsers = getUsers()
    const mergedUsers = [...localUsers]

    for (const cloudUser of cloudUsers) {
      const existing = mergedUsers.find(u => u.id === cloudUser.id)
      if (!existing || new Date((cloudUser.updatedAt || cloudUser.createdAt)!).getTime() > new Date(existing.lastLogin || '1970-01-01').getTime()) {
        mergedUsers.push({
          id: cloudUser.id!,
          name: cloudUser.name!,
          username: cloudUser.username!,
          password: cloudUser.password!,
          role: cloudUser.role! as any,
          isActive: cloudUser.isActive!,
          failedAttempts: cloudUser.failedAttempts!,
          lockedUntil: cloudUser.lockedUntil || null,
          lastLogin: cloudUser.lastLogin || null,
          createdAt: cloudUser.createdAt!
        } as any)
      }
    }
    saveUsers(mergedUsers.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i))

    // Sync commandes (fusion)
    const cloudCommandes = await CommandeModel.find({})
    const localCommandes = getCommandes()
    const mergedCommandes = [...localCommandes]

    for (const cloudCommande of cloudCommandes) {
      const existing = mergedCommandes.find(c => c.id === cloudCommande.id)
      if (!existing || new Date(cloudCommande.updatedAt!).getTime() > new Date(existing.updatedAt).getTime()) {
        mergedCommandes.push({
          id: cloudCommande.id!,
          numero: cloudCommande.numero!,
          serveurId: cloudCommande.serveurId!,
          serveurNom: cloudCommande.serveurNom!,
          tableId: cloudCommande.tableId!,
          tableNumero: cloudCommande.tableNumero!,
          type: cloudCommande.type! as any,
          statut: cloudCommande.statut! as any,
          lignes: cloudCommande.lignes,
          total: cloudCommande.total!,
          notes: cloudCommande.notes!,
          createdAt: cloudCommande.createdAt!,
          updatedAt: cloudCommande.updatedAt!,
          modePaiement: cloudCommande.modePaiement || null
        })
      }
    }
    saveCommandes(mergedCommandes.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i))

    // Sync produits (fusion)
    const cloudProduits = await ProduitModel.find({})
    const localProduits = getProduits()
    const mergedProduits = [...localProduits]

    for (const cloudProduit of cloudProduits) {
      const existing = mergedProduits.find(p => p.id === cloudProduit.id)
      if (!existing) {
        mergedProduits.push({
          id: cloudProduit.id!,
          code: cloudProduit.code!,
          nom: cloudProduit.nom!,
          prix: cloudProduit.prix!,
          categorie: cloudProduit.categorie!,
          stock: cloudProduit.stock!,
          stockMin: cloudProduit.stockMin!,
          unite: cloudProduit.unite!,
          actif: cloudProduit.actif!
        })
      }
    }
    saveProduits(mergedProduits.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i))

    // Sync tables (fusion)
    const cloudTables = await TableModel.find({})
    const localTables = getTables()
    const mergedTables = [...localTables]

    for (const cloudTable of cloudTables) {
      const existing = mergedTables.find(t => t.id === cloudTable.id)
      if (!existing) {
        mergedTables.push({
          id: cloudTable.id!,
          numero: cloudTable.numero!,
          zone: cloudTable.zone! as any,
          capacite: cloudTable.capacite!,
          statut: cloudTable.statut! as any
        })
      }
    }
    saveTables(mergedTables.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i))

    // Sync séjours (fusion)
    const cloudSejours = await SejourModel.find({})
    const localSejours = getSejours()
    const mergedSejours = [...localSejours]

    for (const cloudSejour of cloudSejours) {
      const existing = mergedSejours.find(s => s.id === cloudSejour.id)
      if (!existing || new Date((cloudSejour.updatedAt || cloudSejour.createdAt)!).getTime() > new Date(existing.createdAt).getTime()) {
        mergedSejours.push({
          id: cloudSejour.id!,
          chambreId: cloudSejour.chambreId!,
          chambreNumero: cloudSejour.chambreNumero || '',
          clientNom: cloudSejour.clientNom!,
          clientPrenom: cloudSejour.clientPrenom || '',
          clientPiece: cloudSejour.clientPiece || '',
          nombrePersonnes: cloudSejour.nombrePersonnes!,
          dateArrivee: cloudSejour.dateArrivee!,
          dateDepart: cloudSejour.dateDepart as string | null,
          nuits: cloudSejour.nuits || 1,
          prixNuit: cloudSejour.tarifNuit || 0,
          consommations: cloudSejour.consommations || [],
          statut: cloudSejour.statut! as any,
          modePaiement: cloudSejour.modePaiement as string | null,
          totalHebergement: cloudSejour.totalHebergement!,
          totalConsommations: cloudSejour.totalConsommations || 0,
          createdAt: cloudSejour.createdAt!
        } as any)
      }
    }
    saveSejours(mergedSejours.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i))

    console.log('Synchronisation depuis le cloud terminée')
    return true
  } catch (error) {
    console.error('Erreur lors de la sync depuis cloud:', error)
    return false
  }
}

// Fonction de sync périodique
export function startPeriodicSync() {
  setInterval(async () => {
    if (mongoose.connection.readyState) {
      await syncToCloud()
      await syncFromCloud()
    }
  }, 5 * 60 * 1000) // Toutes les 5 minutes
}