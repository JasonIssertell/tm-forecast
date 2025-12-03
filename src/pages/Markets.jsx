import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, formatPercent, formatCurrency } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Markets() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const { isAdmin } = useAuth()

  useEffect(() => {
    fetchMarkets()
  }, [filter])

  const fetchMarkets = async () => {
    setLoading(true)
    let query = supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching markets:', error)
    } else {
      setMarkets(data || [])
    }
    setLoading(false)
  }

  const getTimeRemaining = (closeDate) => {
    const now = new Date()
    const close = new Date(closeDate)
    const diff = close - now

    if (diff <= 0) return 'Closed'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h left`
    if (hours > 0) return `${hours}h left`
    return 'Closing soon'
  }

  const calculatePrice = (yesPool, noPool) => {
    const total = yesPool + noPool
    return {
      yes: yesPool / total,
      no: noPool / total
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display text-masters-50 mb-2">Markets</h1>
          <p className="text-masters-400">Place your predictions on TaylorMade outcomes</p>
        </div>

        {/* Filter tabs */}
        <div className="flex bg-rough rounded-lg p-1 border border-masters-800">
          {['open', 'closed', 'resolved', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                filter === tab
                  ? 'bg-masters-900 text-gold-500'
                  : 'text-masters-400 hover:text-masters-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Markets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-masters-800 rounded w-3/4 mb-4"></div>
              <div className="h-6 bg-masters-800 rounded w-1/2 mb-4"></div>
              <div className="h-10 bg-masters-800 rounded"></div>
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-16 h-16 bg-masters-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-masters-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-display text-masters-300 mb-2">No markets yet</h3>
          <p className="text-masters-500 mb-6">
            {filter === 'open' ? 'No open markets available.' : `No ${filter} markets found.`}
          </p>
          {isAdmin && filter === 'open' && (
            <Link to="/admin/create" className="btn-gold inline-block">
              Create First Market
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market, index) => {
            const prices = calculatePrice(
              parseFloat(market.yes_pool),
              parseFloat(market.no_pool)
            )
            const isOpen = market.status === 'open'
            const isResolved = market.status === 'resolved'

            return (
              <Link
                key={market.id}
                to={`/markets/${market.id}`}
                className={`card card-hover p-6 block animate-fade-in`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isOpen 
                      ? 'bg-green-500/20 text-green-400'
                      : isResolved
                        ? 'bg-gold-500/20 text-gold-500'
                        : 'bg-masters-700 text-masters-400'
                  }`}>
                    {market.status.toUpperCase()}
                  </span>
                  {isOpen && (
                    <span className="text-masters-500 text-xs">
                      {getTimeRemaining(market.close_date)}
                    </span>
                  )}
                </div>

                {/* Question */}
                <h3 className="text-lg font-medium text-masters-50 mb-4 leading-snug line-clamp-2">
                  {market.question}
                </h3>

                {/* Prices */}
                {isResolved ? (
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${
                      market.resolution === 'yes' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      Resolved: {market.resolution?.toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Yes bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 text-sm font-medium w-8">Yes</span>
                      <div className="flex-1 h-8 bg-fairway rounded-lg overflow-hidden relative">
                        <div 
                          className="absolute inset-y-0 left-0 bg-green-500/30 transition-all duration-500"
                          style={{ width: `${prices.yes * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-green-400 font-semibold text-sm">
                          {formatPercent(prices.yes)}
                        </span>
                      </div>
                    </div>
                    {/* No bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 text-sm font-medium w-8">No</span>
                      <div className="flex-1 h-8 bg-fairway rounded-lg overflow-hidden relative">
                        <div 
                          className="absolute inset-y-0 left-0 bg-red-500/30 transition-all duration-500"
                          style={{ width: `${prices.no * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-red-400 font-semibold text-sm">
                          {formatPercent(prices.no)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin resolve link */}
                {isAdmin && market.status === 'closed' && (
                  <Link
                    to={`/admin/resolve/${market.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 block text-center text-gold-500 text-sm hover:text-gold-400"
                  >
                    → Resolve this market
                  </Link>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
