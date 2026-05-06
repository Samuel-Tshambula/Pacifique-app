/**
 * src/App.tsx
 *
 * ÉTAPE 6 — Routing basé uniquement sur le rôle utilisateur.
 *            ProtectedRoute gère les guards — config.json n'intervient pas ici.
 */

import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useConfigStore } from './store/configStore'
import Login from './pages/auth/Login'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import PlanSalle from './pages/ventes/PlanSalle'
import Commande from './pages/ventes/Commande'
import Cuisine from './pages/cuisine/Cuisine'
import Utilisateurs from './pages/admin/Utilisateurs'
import Stock from './pages/stock/Stock'
import Hebergement from './pages/hebergement/Hebergement'
import Ticket from './pages/ticket/Ticket'
import Rapports from './pages/rapports/Rapports'
import Configuration from './pages/config/Configuration'

export default function App() {
  const { loadConfig, isLoaded } = useConfigStore()

  // Charger la config runtime au démarrage (une seule fois)
  useEffect(() => {
    if (!isLoaded) loadConfig()
  }, [isLoaded, loadConfig])

  return (
    <HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{ duration: 5000 }}
        containerStyle={{ zIndex: 9999 }}
      />
      <Routes>
        {/* Page publique */}
        <Route path="/login" element={<Login />} />

        {/* Routes protégées — guard dans MainLayout via ProtectedRoute */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard"       element={<Dashboard />} />
          <Route path="/ventes"          element={<PlanSalle />} />
          <Route path="/ventes/commande" element={<Commande />} />
          <Route path="/cuisine"         element={<Cuisine />} />
          <Route path="/utilisateurs"    element={<Utilisateurs />} />
          <Route path="/hebergement"     element={<Hebergement />} />
          <Route path="/stock"           element={<Stock />} />
          <Route path="/ticket/:id"      element={<Ticket />} />
          <Route path="/rapports"        element={<Rapports />} />
          <Route path="/configuration"   element={<Configuration />} />
        </Route>

        {/* Fallback → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}
