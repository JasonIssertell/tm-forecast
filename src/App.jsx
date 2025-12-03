import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Markets from './pages/Markets'
import MarketDetail from './pages/MarketDetail'
import Portfolio from './pages/Portfolio'
import Leaderboard from './pages/Leaderboard'
import CreateMarket from './pages/CreateMarket'
import ResolveMarket from './pages/ResolveMarket'
import LoadingSpinner from './components/LoadingSpinner'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (!isAdmin) {
    return <Navigate to="/markets" replace />
  }
  
  return children
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-fairway">
      {user && <Navbar />}
      <main className={user ? 'pt-4' : ''}>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/markets" replace /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/markets" replace /> : <Register />} 
          />
          
          {/* Protected routes */}
          <Route path="/markets" element={
            <ProtectedRoute><Markets /></ProtectedRoute>
          } />
          <Route path="/markets/:id" element={
            <ProtectedRoute><MarketDetail /></ProtectedRoute>
          } />
          <Route path="/portfolio" element={
            <ProtectedRoute><Portfolio /></ProtectedRoute>
          } />
          <Route path="/leaderboard" element={
            <ProtectedRoute><Leaderboard /></ProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin/create" element={
            <AdminRoute><CreateMarket /></AdminRoute>
          } />
          <Route path="/admin/resolve/:id" element={
            <AdminRoute><ResolveMarket /></AdminRoute>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/markets" replace />} />
          <Route path="*" element={<Navigate to="/markets" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
