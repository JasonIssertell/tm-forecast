import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, formatCurrency, formatPercent } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function MarketDetail() {
  const { id } = useParams()
  const { user, profile, refreshProfile, isAdmin } = useAuth()
  const [market, setMarket] = useState(null)
  const [position, setPosition] = useState(null)
  const [priceHistory, setPriceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [betSide, setBetSide] = useState('yes')
  const [betAmount, setBetAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchMarket()
    fetchPosition()
    fetchPriceHistory()
  }, [id])

  const fetchMarket = async () => {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching market:', error)
    } else {
      setMarket(data)
    }
    setLoading(false)
  }

  const fetchPosition = async () => {
    const { data } = await supabase
      .from('positions')
      .select('*')
      .eq('market_id', id)
      .eq('user_id', user.id)

    if (data && data.length > 0) {
      // Combine yes and no positions
      const positions = {}
      data.forEach(p => {
        positions[p.side] = p
      })
      setPosition(positions)
    }
  }

  const fetchPriceHistory = async () => {
    const { data } = await supabase
      .from('price_history')
      .select('*')
      .eq('market_id', id)
      .order('recorded_at', { ascending: true })

    if (data) {
      setPriceHistory(data.map(p => ({
        time: new Date(p.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        yes: parseFloat(p.yes_price) * 100,
        no: (1 - parseFloat(p.yes_price)) * 100
      })))
    }
  }

  const calculatePrice = (yesPool, noPool) => {
    const total = yesPool + noPool
    return {
      yes: yesPool / total,
      no: noPool / total
    }
  }

  const handleBet = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const amount = parseFloat(betAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (amount > profile.balance) {
      setError('Insufficient balance')
      return
    }

    setSubmitting(true)

    try {
      const yesPool = parseFloat(market.yes_pool)
      const noPool = parseFloat(market.no_pool)
      const prices = calculatePrice(yesPool, noPool)
      const price = betSide === 'yes' ? prices.yes : prices.no
      const shares = amount / price

      // Update user balance
      const newBalance = profile.balance - amount
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id)

      if (balanceError) throw balanceError

      // Update market pools
      const newYesPool = betSide === 'yes' ? yesPool + amount : yesPool
      const newNoPool = betSide === 'no' ? noPool + amount : noPool

      const { error: marketError } = await supabase
        .from('markets')
        .update({ yes_pool: newYesPool, no_pool: newNoPool })
        .eq('id', id)

      if (marketError) throw marketError

      // Record price history
      const newPrices = calculatePrice(newYesPool, newNoPool)
      await supabase.from('price_history').insert({
        market_id: id,
        yes_price: newPrices.yes
      })

      // Create or update position
      const existingPosition = position?.[betSide]
      if (existingPosition) {
        const totalShares = parseFloat(existingPosition.shares) + shares
        const totalCost = parseFloat(existingPosition.shares) * parseFloat(existingPosition.avg_price) + amount
        const newAvgPrice = totalCost / totalShares

        await supabase
          .from('positions')
          .update({ shares: totalShares, avg_price: newAvgPrice })
          .eq('id', existingPosition.id)
      } else {
        await supabase.from('positions').insert({
          user_id: user.id,
          market_id: id,
          side: betSide,
          shares: shares,
          avg_price: price
        })
      }

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        market_id: id,
        side: betSide,
        shares: shares,
        price_per_share: price,
        total_cost: amount,
        balance_after: newBalance
      })

      setSuccess(`Bought ${shares.toFixed(2)} ${betSide.toUpperCase()} shares!`)
      setBetAmount('')
      fetchMarket()
      fetchPosition()
      fetchPriceHistory()
      refreshProfile()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8 animate-pulse">
          <div className="h-8 bg-masters-800 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-masters-800 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-masters-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (!market) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <h2 className="text-xl text-masters-300">Market not found</h2>
          <Link to="/markets" className="text-gold-500 mt-4 inline-block">← Back to markets</Link>
        </div>
      </div>
    )
  }

  const prices = calculatePrice(parseFloat(market.yes_pool), parseFloat(market.no_pool))
  const isOpen = market.status === 'open'
  const isResolved = market.status === 'resolved'
  const previewShares = betAmount && !isNaN(parseFloat(betAmount)) 
    ? parseFloat(betAmount) / (betSide === 'yes' ? prices.yes : prices.no)
    : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link to="/markets" className="text-masters-400 hover:text-masters-200 text-sm mb-6 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Markets
      </Link>

      {/* Main card */}
      <div className="card p-6 sm:p-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-3 ${
              isOpen 
                ? 'bg-green-500/20 text-green-400'
                : isResolved
                  ? 'bg-gold-500/20 text-gold-500'
                  : 'bg-masters-700 text-masters-400'
            }`}>
              {market.status.toUpperCase()}
            </span>
            <h1 className="text-2xl sm:text-3xl font-display text-masters-50 leading-tight">
              {market.question}
            </h1>
            {market.description && (
              <p className="text-masters-400 mt-3">{market.description}</p>
            )}
          </div>
        </div>

        {/* Resolution result */}
        {isResolved && (
          <div className={`p-4 rounded-lg mb-6 ${
            market.resolution === 'yes' ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                market.resolution === 'yes' ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {market.resolution === 'yes' ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-semibold text-masters-50">
                  Resolved: {market.resolution?.toUpperCase()}
                </p>
                <p className="text-sm text-masters-400">
                  {market.resolution === 'yes' ? 'YES' : 'NO'} shares paid out $1.00 each
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current prices */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-lg border ${
            betSide === 'yes' && isOpen ? 'border-green-500 bg-green-500/10' : 'border-masters-800 bg-fairway'
          }`}>
            <div className="text-sm text-masters-400 mb-1">Yes Price</div>
            <div className="text-3xl font-bold text-green-400">{formatPercent(prices.yes)}</div>
            <div className="text-xs text-masters-500 mt-1">
              Pool: {formatCurrency(market.yes_pool)}
            </div>
          </div>
          <div className={`p-4 rounded-lg border ${
            betSide === 'no' && isOpen ? 'border-red-500 bg-red-500/10' : 'border-masters-800 bg-fairway'
          }`}>
            <div className="text-sm text-masters-400 mb-1">No Price</div>
            <div className="text-3xl font-bold text-red-400">{formatPercent(prices.no)}</div>
            <div className="text-xs text-masters-500 mt-1">
              Pool: {formatCurrency(market.no_pool)}
            </div>
          </div>
        </div>

        {/* Price history chart */}
        {priceHistory.length > 1 && (
          <div className="mb-6">
            <h3 className="text-sm text-masters-400 mb-3">Price History</h3>
            <div className="h-48 bg-fairway rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <XAxis 
                    dataKey="time" 
                    stroke="#4a6550" 
                    tick={{ fill: '#4a6550', fontSize: 10 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    stroke="#4a6550"
                    tick={{ fill: '#4a6550', fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a2e1f', 
                      border: '1px solid #2a3f2e',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="yes" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={false}
                    name="Yes %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Betting form */}
        {isOpen && (
          <div className="border-t border-masters-800 pt-6">
            <h3 className="text-lg font-medium text-masters-50 mb-4">Place Your Bet</h3>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-4 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleBet} className="space-y-4">
              {/* Side selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBetSide('yes')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    betSide === 'yes'
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-masters-700 hover:border-masters-600'
                  }`}
                >
                  <span className="text-green-400 font-bold text-lg">YES</span>
                  <span className="block text-masters-400 text-sm mt-1">
                    {formatPercent(prices.yes)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBetSide('no')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    betSide === 'no'
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-masters-700 hover:border-masters-600'
                  }`}
                >
                  <span className="text-red-400 font-bold text-lg">NO</span>
                  <span className="block text-masters-400 text-sm mt-1">
                    {formatPercent(prices.no)}
                  </span>
                </button>
              </div>

              {/* Amount input */}
              <div>
                <label className="label">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-masters-500">$</span>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="input-field w-full pl-8"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    max={profile?.balance}
                  />
                </div>
                <div className="flex justify-between text-xs text-masters-500 mt-2">
                  <span>Balance: {formatCurrency(profile?.balance || 0)}</span>
                  <button 
                    type="button" 
                    onClick={() => setBetAmount(profile?.balance?.toString() || '')}
                    className="text-gold-500 hover:text-gold-400"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Preview */}
              {previewShares > 0 && (
                <div className="bg-fairway p-4 rounded-lg border border-masters-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-masters-400">You'll receive:</span>
                    <span className="text-masters-50 font-medium">
                      {previewShares.toFixed(2)} {betSide.toUpperCase()} shares
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-masters-400">Potential payout:</span>
                    <span className="text-green-400 font-medium">
                      {formatCurrency(previewShares)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-masters-400">Potential profit:</span>
                    <span className="text-green-400 font-medium">
                      {formatCurrency(previewShares - parseFloat(betAmount))}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !betAmount}
                className={`w-full py-4 rounded-lg font-semibold transition-all ${
                  betSide === 'yes'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {submitting ? 'Placing bet...' : `Buy ${betSide.toUpperCase()}`}
              </button>
            </form>
          </div>
        )}

        {/* Your position */}
        {position && (position.yes || position.no) && (
          <div className="border-t border-masters-800 pt-6 mt-6">
            <h3 className="text-lg font-medium text-masters-50 mb-4">Your Position</h3>
            <div className="grid grid-cols-2 gap-4">
              {position.yes && (
                <div className="bg-fairway p-4 rounded-lg border border-green-500/30">
                  <div className="text-green-400 font-medium mb-1">YES Shares</div>
                  <div className="text-2xl text-masters-50">{parseFloat(position.yes.shares).toFixed(2)}</div>
                  <div className="text-xs text-masters-500">
                    Avg price: {formatPercent(position.yes.avg_price)}
                  </div>
                  <div className="text-sm text-masters-400 mt-2">
                    Current value: {formatCurrency(position.yes.shares * prices.yes)}
                  </div>
                </div>
              )}
              {position.no && (
                <div className="bg-fairway p-4 rounded-lg border border-red-500/30">
                  <div className="text-red-400 font-medium mb-1">NO Shares</div>
                  <div className="text-2xl text-masters-50">{parseFloat(position.no.shares).toFixed(2)}</div>
                  <div className="text-xs text-masters-500">
                    Avg price: {formatPercent(position.no.avg_price)}
                  </div>
                  <div className="text-sm text-masters-400 mt-2">
                    Current value: {formatCurrency(position.no.shares * prices.no)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && market.status === 'closed' && (
          <div className="border-t border-masters-800 pt-6 mt-6">
            <Link
              to={`/admin/resolve/${market.id}`}
              className="btn-gold inline-block"
            >
              Resolve This Market
            </Link>
          </div>
        )}

        {/* Market info */}
        <div className="border-t border-masters-800 pt-6 mt-6 text-sm text-masters-500">
          <div className="flex justify-between">
            <span>Closes:</span>
            <span>{new Date(market.close_date).toLocaleString()}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Created:</span>
            <span>{new Date(market.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
