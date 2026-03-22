import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AuthPage from './components/Auth/AuthPage'
import Layout from './components/Layout/Layout'
import CharacterList from './components/CharacterList/CharacterList'
import CharacterSheet from './components/CharacterSheet/CharacterSheet'
import DMScreen from './components/DMScreen/DMScreen'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0b07', color: '#d4a843', fontFamily: 'Cinzel, serif', fontSize: '1.2rem' }}>
      Chargement...
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={
          <PrivateRoute>
            <Layout><CharacterList /></Layout>
          </PrivateRoute>
        } />
        <Route path="/sheet/:id" element={
          <PrivateRoute>
            <Layout><CharacterSheet /></Layout>
          </PrivateRoute>
        } />
        <Route path="/dm" element={
          <PrivateRoute>
            <DMScreen />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
