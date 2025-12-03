import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, formatCurrency, formatPercent } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Portfolio() {
  const { user, profile } = useAuth()
  const [positions, setPositions] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('positions')

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    
    // Fetch positions with market data
    const { data: posData } = await supabase
      .from('positions')
      .select(`
        *,
        markets (
          id,
          question,
          status,
          resolution,
          yes_pool,
          no_pool
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (posData) {
      setPositions(posData)
    }

    // Fetch transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select(`
        *,
        markets (
          question
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (txData) {
      setTransactions(txData)
    }

    setLoading(false)
  }

  const calculatePortfolioValue = () => {
    let openValue = 0
    positions.forEach(pos => {
      if (pos.markets?.status === 'open' || pos.markets?.status === 'closed') {
        const yesPool = parseFloat(pos.markets.yes_pool)
        const noPool = parseFloat(pos.markets.no_pool)
        const price = pos.side === 'yes' 
          ? yesPool / (yesPool + noPool)
          : noPool / (yesPool + noPool)
        openValue += parseFloat(pos.shares) * price
      }
    })
    return openValue
  }

  const getTotalPnL = () => {
    let totalInvested = 0
    let totalValue = parseFloat(profile?.balance || 0)
    
    positions.forEach(pos => {
      const invested = parseFloat(pos.shares) * parseFloat(pos.avg_price)
      totalInvested += invested
      
      if (pos.markets?.status === 'open' || pos.markets?.status === 'closed') {
        const yesPool = parseFloat(pos.markets.yes_pool)
        const noPool = parseFloat(pos.markets.no_pool)
        const price = pos.side === 'yes' 
          ? yesPool / (yesPool + noPool)
          : noPool / (yesPool + noPool)
        totalValue += parseFloat(pos.shares) * price
      } else if (pos.markets?.status === 'resolved') {
        if (pos.side === pos.markets.resolution) {
          // Already paid out, counted in balance
        }
      }
    })
    
    return totalValue - 1000 // Started with $1000
  }

  const openPositions = positions.filter(p => 
    p.markets?.status === 'open' || p.markets?.status === 'closed'
  )
  const resolvedPositions = positions.filter(p => p.markets?.status === 'resolved')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-in">
        <div className="card p-6">
          <div className="text-masters-400 text-sm mb-1">Cash Balance</div>
          <div className="text-3xl font-bold text-gold-500">
            {formatCurrency(profile?.balance || 0)}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-masters-400 text-sm mb-1">Position Value</div>
          <div className="text-3xl font-bold text-masters-50">
            {formatCurrency(calculatePortfolioValue())}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-masters-400 text-sm mb-1">Total P&L</div>
          <div className={`text-3xl font-bold ${getTotalPnL() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {getTotalPnL() >= 0 ? '+' : ''}{formatCurrency(getTotalPnL())}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-rough rounded-lg p-1 border border-masters-800 mb-6 animate-fade-in stagger-2">
        {['positions', 'history', 'resolved'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
              tab === t
                ? 'bg-masters-900 text-gold-500'
                : 'text-masters-400 hover:text-masters-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 animate-pulse">
          <div className="h-20 bg-masters-800 rounded"></div>
        </div>
      ) : (
        <>
          {/* Open Positions */}
          {tab === 'positions' && (
            <div className="space-y-4 animate-fade-in">
              {openPositions.length === 0 ? (
                <div className="card p-8 text-center">
                  <div className="w-16 h-16 bg-masters-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-masters-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-xl text-masters-300 mb-2">No Open Positions</h3>
                  <p className="text-masters-500 mb-6">Start betting on markets to build your portfolio</p>
                  <Link to="/markets" className="btn-gold inline-block">
                    Browse Markets
                  </Link>
                </div>
              ) : (
                openPositions.map((pos, idx) => {
                  const yesPool = parseFloat(pos.markets.yes_pool)
                  const noPool = parseFloat(pos.markets.no_pool)
                  const currentPrice = pos.side === 'yes' 
                    ? yesPool / (yesPool + noPool)
                    : noPool / (yesPool + noPool)
                  const shares = parseFloat(pos.shares)
                  const avgPrice = parseFloat(pos.avg_price)
                  const costBasis = shares * avgPrice
                  const currentValue = shares * currentPrice
                  const pnl = currentValue - costBasis
                  const pnlPercent = (pnl / costBasis) * 100

                  return (
                    <Link
                      key={pos.id}
                      to={`/markets/${pos.markets.id}`}
                      className="card card-hover p-5 block"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                            pos.side === 'yes' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {pos.side.toUpperCase()}
                          </span>
                          <h3 className="text-masters-50 font-medium line-clamp-1">
                            {pos.markets.question}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-masters-400">
                              {shares.toFixed(2)} shares @ {formatPercent(avgPrice)}
                            </span>
                            <span className="text-masters-500">→</span>
                            <span className="text-masters-300">
                              Now {formatPercent(currentPrice)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-masters-50 font-semibold">
                            {formatCurrency(currentValue)}
                          </div>
                          <div className={`text-sm ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          )}

          {/* Transaction History */}
          {tab === 'history' && (
            <div className="card overflow-hidden animate-fade-in">
              {transactions.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-masters-500">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-masters-800">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 hover:bg-masters-900/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                            tx.side === 'yes' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            BUY {tx.side.toUpperCase()}
                          </span>
                          <span className="text-masters-300 text-sm">
                            {parseFloat(tx.shares).toFixed(2)} shares
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-masters-50">{formatCurrency(tx.total_cost)}</div>
                          <div className="text-masters-500 text-xs">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <p className="text-masters-500 text-sm mt-1 line-clamp-1">
                        {tx.markets?.question}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resolved Positions */}
          {tab === 'resolved' && (
            <div className="space-y-4 animate-fade-in">
              {resolvedPositions.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-masters-500">No resolved positions yet</p>
                </div>
              ) : (
                resolvedPositions.map((pos) => {
                  const won = pos.side === pos.markets.resolution
                  const shares = parseFloat(pos.shares)
                  const payout = won ? shares : 0
                  const cost = shares * parseFloat(pos.avg_price)
                  const pnl = payout - cost

                  return (
                    <div
                      key={pos.id}
                      className={`card p-5 border-l-4 ${
                        won ? 'border-l-green-500' : 'border-l-red-500'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              pos.side === 'yes' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {pos.side.toUpperCase()}
                            </span>
                            {won ? (
                              <span className="text-green-400 text-xs font-medium">✓ Won</span>
                            ) : (
                              <span className="text-red-400 text-xs font-medium">✗ Lost</span>
                            )}
                          </div>
                          <h3 className="text-masters-300 line-clamp-1">
                            {pos.markets.question}
                          </h3>
                          <p className="text-masters-500 text-sm mt-1">
                            {shares.toFixed(2)} shares • Resolved {pos.markets.resolution?.toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                          </div>
                          <div className="text-masters-500 text-xs">
                            Payout: {formatCurrency(payout)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
