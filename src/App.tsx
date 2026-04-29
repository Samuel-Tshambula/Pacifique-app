import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
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

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ventes" element={<PlanSalle />} />
          <Route path="/ventes/commande" element={<Commande />} />
          <Route path="/cuisine" element={<Cuisine />} />
          <Route path="/utilisateurs" element={<Utilisateurs />} />
          <Route path="/hebergement" element={<Hebergement />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/ticket/:id" element={<Ticket />} />
          <Route path="/rapports" element={<div style={{padding:24}}>Module Rapports — à venir</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
