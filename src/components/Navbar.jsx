import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../lib/supabase'
import { useState } from 'react'

export default function Navbar() {
  const { profile, signOut, isAdmin } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')
  
  const navLinks = [
    { path: '/markets', label: 'Markets' },
    { path: '/portfolio', label: 'Portfolio' },
    { path: '/leaderboard', label: 'Leaderboard' },
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <nav className="bg-rough/80 backdrop-blur-md border-b border-masters-900/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/markets" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-masters-900 rounded-lg flex items-center justify-center border border-masters-700 group-hover:border-gold-500 transition-colors">
              <svg className="w-6 h-6 text-gold-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 4v16M8 4l8 4-8 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-xl text-masters-50">TM </span>
              <span className="font-display text-xl text-gold-500">FORE</span>
              <span className="font-display text-xl text-masters-50">cast</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(path)
                    ? 'bg-masters-900 text-gold-500 border border-masters-700'
                    : 'text-masters-300 hover:text-masters-50 hover:bg-masters-900/50'
                }`}
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin/create"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/admin')
                    ? 'bg-gold-500/20 text-gold-500 border border-gold-500/50'
                    : 'text-gold-500/70 hover:text-gold-500 hover:bg-gold-500/10'
                }`}
              >
                + Create Market
              </Link>
            )}
          </div>

          {/* User Info & Balance */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-masters-400 text-xs">Balance</span>
              <span className="text-gold-500 font-semibold">
                {profile ? formatCurrency(profile.balance) : '—'}
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-masters-800">
              <div className="flex flex-col items-end">
                <span className="text-masters-50 text-sm font-medium">{profile?.name}</span>
                {isAdmin && (
                  <span className="text-gold-500 text-xs">Admin</span>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="text-masters-400 hover:text-masters-200 transition-colors p-2"
                title="Sign out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-masters-400 hover:text-masters-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-masters-800">
            <div className="flex flex-col gap-2">
              {navLinks.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive(path)
                      ? 'bg-masters-900 text-gold-500'
                      : 'text-masters-300 hover:text-masters-50 hover:bg-masters-900/50'
                  }`}
                >
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-gold-500 hover:bg-gold-500/10"
                >
                  + Create Market
                </Link>
              )}
              <div className="px-4 py-3 border-t border-masters-800 mt-2 flex justify-between items-center">
                <span className="text-masters-400">Balance: <span className="text-gold-500 font-semibold">{profile ? formatCurrency(profile.balance) : '—'}</span></span>
                <button
                  onClick={handleSignOut}
                  className="text-masters-400 hover:text-red-400 text-sm"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
