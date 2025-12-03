import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase, formatCurrency, formatPercent } from '../lib/supabase'

export default function ResolveMarket() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [market, setMarket] = useState(null)
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolution, setResolution] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMarket()
    fetchPositions()
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

  const fetchPositions = async () => {
    const { data } = await supabase
      .from('positions')
      .select(`
        *,
        profiles (name, email)
      `)
      .eq('market_id', id)

    if (data) {
      setPositions(data)
    }
  }

  const handleResolve = async () => {
    if (!resolution) {
      setError('Please select YES or NO')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Update market status and resolution
      const { error: marketError } = await supabase
        .from('markets')
        .update({ 
          status: 'resolved', 
          resolution: resolution 
        })
        .eq('id', id)

      if (marketError) throw marketError

      // Pay out winners
      const winners = positions.filter(p => p.side === resolution)
      
      for (const pos of winners) {
        const payout = parseFloat(pos.shares) // $1 per share
        
        // Get current balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', pos.user_id)
          .single()

        if (profile) {
          // Update balance
          await supabase
            .from('profiles')
            .update({ balance: parseFloat(profile.balance) + payout })
            .eq('id', pos.user_id)
        }
      }

      navigate(`/markets/${id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card p-8 animate-pulse">
          <div className="h-8 bg-masters-800 rounded w-3/4 mb-4"></div>
          <div className="h-32 bg-masters-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (!market) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <h2 className="text-xl text-masters-300">Market not found</h2>
          <Link to="/markets" className="text-gold-500 mt-4 inline-block">← Back to markets</Link>
        </div>
      </div>
    )
  }

  if (market.status === 'resolved') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <h2 className="text-xl text-masters-300 mb-2">Already Resolved</h2>
          <p className="text-masters-500">This market was resolved as {market.resolution?.toUpperCase()}</p>
          <Link to={`/markets/${id}`} className="text-gold-500 mt-4 inline-block">← View market</Link>
        </div>
      </div>
    )
  }

  const yesPositions = positions.filter(p => p.side === 'yes')
  const noPositions = positions.filter(p => p.side === 'no')
  const totalYesShares = yesPositions.reduce((sum, p) => sum + parseFloat(p.shares), 0)
  const totalNoShares = noPositions.reduce((sum, p) => sum + parseFloat(p.shares), 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link to="/markets" className="text-masters-400 hover:text-masters-200 text-sm mb-6 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Markets
      </Link>

      <div className="card p-6 sm:p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-display text-masters-50">Resolve Market</h1>
            <p className="text-masters-400 text-sm">Declare the outcome and pay winners</p>
          </div>
        </div>

        {/* Market question */}
        <div className="bg-fairway p-4 rounded-lg border border-masters-800 mb-6">
          <p className="text-masters-50 font-medium text-lg">{market.question}</p>
          {market.description && (
            <p className="text-masters-400 text-sm mt-2">{market.description}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Resolution options */}
        <div className="mb-6">
          <p className="label mb-3">What was the outcome?</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setResolution('yes')}
              className={`p-6 rounded-lg border-2 transition-all text-center ${
                resolution === 'yes'
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-masters-700 hover:border-green-500/50'
              }`}
            >
              <div className="text-green-400 font-bold text-2xl mb-2">YES</div>
              <div className="text-masters-400 text-sm">
                {yesPositions.length} holders win
              </div>
              <div className="text-masters-500 text-xs mt-1">
                {totalYesShares.toFixed(2)} shares → {formatCurrency(totalYesShares)} payout
              </div>
            </button>
            <button
              type="button"
              onClick={() => setResolution('no')}
              className={`p-6 rounded-lg border-2 transition-all text-center ${
                resolution === 'no'
                  ? 'border-red-500 bg-red-500/20'
                  : 'border-masters-700 hover:border-red-500/50'
              }`}
            >
              <div className="text-red-400 font-bold text-2xl mb-2">NO</div>
              <div className="text-masters-400 text-sm">
                {noPositions.length} holders win
              </div>
              <div className="text-masters-500 text-xs mt-1">
                {totalNoShares.toFixed(2)} shares → {formatCurrency(totalNoShares)} payout
              </div>
            </button>
          </div>
        </div>

        {/* Position breakdown */}
        {positions.length > 0 && (
          <div className="mb-6">
            <p className="label mb-3">Positions to settle ({positions.length} total)</p>
            <div className="bg-fairway rounded-lg border border-masters-800 max-h-48 overflow-y-auto">
              {positions.map(pos => (
                <div 
                  key={pos.id} 
                  className={`px-4 py-3 border-b border-masters-800 last:border-0 flex justify-between items-center ${
                    resolution && pos.side === resolution ? 'bg-green-500/10' : ''
                  }`}
                >
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded mr-2 ${
                      pos.side === 'yes' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {pos.side.toUpperCase()}
                    </span>
                    <span className="text-masters-300">{pos.profiles?.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-masters-400">{parseFloat(pos.shares).toFixed(2)} shares</span>
                    {resolution && pos.side === resolution && (
                      <span className="text-green-400 text-xs ml-2">+{formatCurrency(pos.shares)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning */}
        {resolution && (
          <div className={`p-4 rounded-lg mb-6 ${
            resolution === 'yes' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <p className={`font-medium ${resolution === 'yes' ? 'text-green-400' : 'text-red-400'}`}>
              Resolving as {resolution.toUpperCase()}
            </p>
            <p className="text-masters-400 text-sm mt-1">
              This will pay out {formatCurrency(resolution === 'yes' ? totalYesShares : totalNoShares)} to {resolution === 'yes' ? yesPositions.length : noPositions.length} winner(s).
              This action cannot be undone.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(`/markets/${id}`)}
            className="btn-outline flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={!resolution || submitting}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              resolution === 'yes' 
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : resolution === 'no'
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-masters-700 text-masters-400'
            }`}
          >
            {submitting ? 'Resolving...' : `Resolve as ${resolution?.toUpperCase() || '...'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
